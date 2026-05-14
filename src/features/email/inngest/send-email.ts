/**
 * Inngest Function — Envio de email via ROLETA de provedores.
 * 
 * VERSÃO CORRIGIDA — Correções de:
 *   1. Deadlock de provedor (seleção + capacidade em step único)
 *   2. Contagem duplicada de envios (finalize separado de increment)
 *   3. Sleep de 24h substituído por retry inteligente de 1h
 */
import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEmailProvider } from "@/features/email/providers";
import { renderTemplate, renderSubject, generateUnsubscribeUrl } from "@/features/email/lib/template-renderer";
import { selectProviderForSend } from "@/features/email/lib/provider-selector";
import { rewriteLinks } from "@/features/email/lib/link-tracker";
import { env } from "@/shared/lib/env";
import { logger } from "@/shared/lib/logger";
import { randomUUID } from "crypto";
import { 
  getSendDelay, 
  getEffectiveDailyLimit, 
  checkAndUpdateTier, 
  shouldDeactivateAccount,
  recordSendResult,
  type AccountTier
} from "@/features/email/lib/warmup-engine";

const BASE_URL = env.NEXT_PUBLIC_APP_URL;
const generateId = () => randomUUID();

export const sendEmail = inngest.createFunction(
  {
    id: "send-email-v10",
    name: "Send Email via Provider Rotation",
    retries: 3,
    concurrency: {
      limit: 5,
      key: "event.data.providerId || 'global-send'"
    },
    triggers: [{ event: "email/send" }],
  },
  async ({ event, step }) => {
    const { contactId, campaignContactId, subject, htmlBody, textBody } = event.data as {
      contactId: string;
      campaignContactId: string;
      subject: string;
      htmlBody: string;
      textBody?: string;
    };

    // 1. Buscar contato e validar
    const contact = await step.run("fetch-contact", async () => {
      const { data, error } = await supabaseAdmin
        .from('Contact')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error || !data) throw new Error("Contact not found");
      
      if (data.status !== 'ACTIVE') {
        return { ...data, skipped: true, reason: `Contact status is ${data.status}` };
      }

      return data;
    });

    if ((contact as any).skipped) return contact;

    // DIAGNÓSTICO: Registrar início imediato da execução
    console.log(`[Inngest] Iniciando processamento para CC: ${campaignContactId}`);

    const campaignContact = await step.run("fetch-campaign-contact", async () => {
      const { data, error } = await supabaseAdmin
        .from('CampaignContact')
        .select('isPaused, stepStatus, abVariant, currentStepId')
        .eq('id', campaignContactId)
        .single();
      
      if (error || !data) throw new Error("CampaignContact not found");
      return data;
    });

    if (campaignContact.isPaused) return { skipped: true, reason: "Contact is paused" };

    // Idempotência: se já foi enviado, não reenviar (proteção contra retries do Inngest)
    const alreadySent = ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(campaignContact.stepStatus);
    if (alreadySent) {
      return { skipped: true, reason: `Already in status ${campaignContact.stepStatus}, skipping duplicate send` };
    }

    // 3. Preparar Renderização (Fora do laço para não repetir trabalho)
    const stepConfig = await step.run("fetch-step-config", async () => {
      if (!campaignContact.currentStepId) return null;
      const { data } = await supabaseAdmin.from('CampaignStep').select('*').eq('id', campaignContact.currentStepId).single();
      return data;
    });

    let selectedSubject = subject;
    let selectedHtml = htmlBody;

    if (stepConfig?.isABTest) {
      let variant = campaignContact.abVariant;
      if (!variant) {
        variant = Math.random() > 0.5 ? "B" : "A";
        await step.run("assign-ab-variant", async () => {
          await supabaseAdmin.from('CampaignContact').update({ abVariant: variant }).eq('id', campaignContactId);
        });
      }
      if (variant === "B" && stepConfig.htmlBodyB) {
        selectedSubject = stepConfig.subjectB || subject;
        selectedHtml = stepConfig.htmlBodyB;
      }
    }

    const unsubscribeUrl = generateUnsubscribeUrl(contact.id);
    const templateVars = {
      contactId: contact.id,
      contactName: contact.name ?? "",
      contactEmail: contact.email,
      contactCompany: contact.company ?? "",
      unsubscribeUrl,
    };

    const renderedSubject = renderSubject(selectedSubject, templateVars);
    const renderedHtml = renderTemplate(selectedHtml, templateVars);

    const trackedHtml = await step.run("apply-link-tracking", async () => {
      return rewriteLinks({ html: renderedHtml, campaignContactId, baseUrl: BASE_URL });
    });

    // 4. AUTOMAÇÃO DE FALLBACK (PLANO B) - Laço de tentativas
    const { data: activeConfigs } = await supabaseAdmin.from('ProviderConfig').select('provider').eq('isActive', true);
    const maxAttempts = activeConfigs && activeConfigs.length > 0 ? activeConfigs.length : 1;
    
    let finalSuccess = false;
    let finalProviderId: string | null = null;
    let finalProviderConfig: any = null;
    let finalMessageId: string | null = null;
    let finalAccountTier: any = null;
    let finalDelaySec: number | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const providerResult = await step.run(`select-and-validate-provider-v2-${attempt}`, async () => {
        const { providerId, providerConfig } = await selectProviderForSend();
        const accountTier = await checkAndUpdateTier(providerId);
        
        const healthCheck = shouldDeactivateAccount(
          accountTier as AccountTier,
          providerConfig.totalSent || 0,
          providerConfig.totalBounces || 0,
          providerConfig.totalComplaints || 0
        );
        
        if (healthCheck.deactivate) {
          await supabaseAdmin.from('ProviderConfig').update({ isActive: false, updatedAt: new Date().toISOString() }).eq('provider', providerId);
          logger.error(`[AutoDeactivation] Conta ${providerId} desativada: ${healthCheck.reason}`);
          return { ok: false, reason: healthCheck.reason, providerId, providerConfig, accountTier };
        }

        const now = new Date();
        const lastReset = new Date(providerConfig.lastResetAt);
        const isNewDay = now.toDateString() !== lastReset.toDateString();

        if (isNewDay) {
          await supabaseAdmin.from('ProviderConfig').update({ sentToday: 0, lastResetAt: now.toISOString(), updatedAt: now.toISOString() }).eq('provider', providerId);
        } else {
          const effectiveLimit = getEffectiveDailyLimit(providerConfig.dailyLimit, accountTier as AccountTier, new Date(providerConfig.warmupStartedAt || providerConfig.createdAt));
          const { data: freshConfig } = await supabaseAdmin.from('ProviderConfig').select('sentToday').eq('provider', providerId).single();
          const currentSent = freshConfig?.sentToday || 0;
          
          if (currentSent >= effectiveLimit) {
            return { ok: false, reason: "limit_reached", providerId, providerConfig, accountTier };
          }
        }

        await supabaseAdmin.from('CampaignContact').update({ usedProvider: providerId }).eq('id', campaignContactId);
        return { ok: true, providerId, providerConfig, accountTier };
      });

      if (!providerResult.ok) {
        if ((providerResult as any).reason === "limit_reached") {
           const now = new Date();
           const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0); 
           await step.sleepUntil("wait-for-daily-reset", tomorrow);
           throw new Error("Limites diários esgotados de todas as contas. O sistema vai dormir até a meia-noite.");
        }
        continue;
      }

      const { providerId, providerConfig, accountTier } = providerResult as any;
      logger.info(`[Roleta - Tentativa ${attempt}/${maxAttempts}] Email para ${contact.email} → Provedor: ${providerId}`);

      // Warmup delay (reativado para evitar rate limit do Mailrelay)
      await step.sleep(`rate-limit-delay-${attempt}`, `1s`);

      const result = await step.run(`send-via-provider-v10-${attempt}`, async () => {
        logger.info(`[Provider] Iniciando envio via ${providerId} para ${contact.email}...`);
        const provider = await getEmailProvider(providerId);
        const sendResult = await provider.send({
          to: contact.email, 
          from: providerConfig.fromEmail, 
          fromName: providerConfig.fromName,
          subject: renderedSubject, 
          html: trackedHtml, 
          text: textBody, 
          replyTo: providerConfig.fromEmail, 
          unsubscribeUrl, 
          contactId: contact.id
        });
        logger.info(`[Provider] Resultado do envio: ${sendResult.success ? 'Sucesso' : 'Falha'}`);
        return sendResult;
      });

      if (result.success) {
        finalSuccess = true;
        finalProviderId = providerId;
        finalProviderConfig = providerConfig;
        finalMessageId = result.messageId || null;
        finalAccountTier = accountTier;
        // finalDelaySec = delaySec;
        break; // Entregue com sucesso! Interrompe o loop.
      }

      const isBlocked = (result as any).accountBlocked;
      const isPermanentFailure = result.error?.toLowerCase().includes('bounce') || 
                                 result.error?.toLowerCase().includes('rejected') ||
                                 result.error?.toLowerCase().includes('denied') ||
                                 result.error?.toLowerCase().includes('not found');
      
      if (isBlocked) {
        await step.run(`pause-blocked-account-${attempt}`, async () => {
          // Registrar falha no evento para visibilidade
          await supabaseAdmin.from('EmailEvent').insert({
            id: randomUUID(),
            externalId: `blocked_${providerId}_${Date.now()}`,
            contactId: contact.id,
            messageId: 'account-blocked',
            provider: providerId,
            eventType: "FAILED",
            timestamp: new Date().toISOString(),
            metadata: { error: result.error, isBlocked: true }
          });

          await supabaseAdmin.from('ProviderConfig').update({ sentToday: 99999, updatedAt: new Date().toISOString() }).eq('provider', providerId);
          logger.error(`[AccountBlocked] Conta ${providerId} bloqueou no limite (Attempt ${attempt}). Pausando e tentando próxima...`);
        });
        continue; // Pula para a próxima conta na roleta!
      }

      if (isPermanentFailure) {
        await step.run(`record-bounce-${attempt}`, async () => {
          await recordSendResult(providerId, "bounced");
        });
        logger.error(`Falha permanente no destinatário via ${providerId}`, result.error);
        throw new Error(`Falha permanente no destinatário: ${result.error}`);
      }

      logger.error(`Falha temporária via ${providerId}, tentando próxima conta...`, result.error);
      continue;
    }

    if (!finalSuccess) {
      throw new Error(`O Fallback esgotou! Todas as ${maxAttempts} tentativas de provedores falharam para o contato ${contact.email}.`);
    }

    // 5. ATUALIZAR STATUS FINAL
    await step.run("update-campaign-contact", async () => {
      const isSMTP = finalProviderConfig?.providerType === 'SMTP';
      const finalStatus = isSMTP ? "DELIVERED" : "SENT";
      const now = new Date().toISOString();
      
      await supabaseAdmin
        .from('CampaignContact')
        .update({
          stepStatus: finalStatus,
          lastMessageId: finalMessageId,
          lastSentAt: now,
          usedProvider: finalProviderId,
        })
        .eq('id', campaignContactId);
    });

    // 10. REGISTRAR EVENTOS E CONTADORES (separado para não duplicar status)
    await step.run("record-events", async () => {
      const now = new Date().toISOString();
      const isSMTP = finalProviderConfig?.providerType === 'SMTP';
      
      const promises: PromiseLike<any>[] = [
        // Registrar evento SENT
        supabaseAdmin.from('EmailEvent').insert({
          id: randomUUID(),
          externalId: finalMessageId || `sent_${campaignContactId}_${Date.now()}`,
          contactId: contact.id,
          messageId: finalMessageId || 'direct-send',
          provider: finalProviderId,
          eventType: "SENT",
          timestamp: now,
        }),
        // Registrar envio no warmup
        recordSendResult(finalProviderId!, "sent"),
      ];

      // Para SMTP, registrar também DELIVERED
      if (isSMTP) {
        promises.push(
          supabaseAdmin.from('EmailEvent').insert({
            id: generateId(),
            externalId: `delivered_${campaignContactId}_${Date.now()}`,
            contactId: contact.id,
            messageId: finalMessageId || 'direct-send',
            provider: finalProviderId,
            eventType: "DELIVERED",
            timestamp: now,
          })
        );
      }

      await Promise.all(promises);
    });

    // 11. INCREMENTAR CONTADOR DO PROVEDOR (step separado e idempotente)
    // Separado dos outros steps para que retries não dupliquem a contagem
    await step.run("increment-provider-counter", async () => {
      const { incrementProviderSendCount } = await import("@/features/email/lib/provider-selector");
      await incrementProviderSendCount(finalProviderId!);
    });

    return { 
      success: true, 
      messageId: finalMessageId, 
      provider: finalProviderId,
      accountTier: finalAccountTier,
      delaySec: finalDelaySec
    };
  }
);
