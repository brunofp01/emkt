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
import { 
  getSendDelay, 
  getEffectiveDailyLimit, 
  checkAndUpdateTier, 
  shouldDeactivateAccount,
  recordSendResult,
  type AccountTier
} from "@/features/email/lib/warmup-engine";

const BASE_URL = env.NEXT_PUBLIC_APP_URL;

export const sendEmail = inngest.createFunction(
  {
    id: "send-email",
    name: "Send Email via Provider Rotation",
    retries: 3,
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

    // 2. Buscar CampaignContact para verificar estado
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

    // 3. SELEÇÃO + VALIDAÇÃO DO PROVEDOR (step único para evitar deadlock)
    // Se este step falha, Inngest faz retry e re-executa a seleção com outro provedor
    const providerResult = await step.run("select-and-validate-provider", async () => {
      // Selecionar provedor com capacidade
      const { providerId, providerConfig } = await selectProviderForSend();
      
      // Verificar tier
      const accountTier = await checkAndUpdateTier(providerId);
      
      // Verificar saúde da conta
      const healthCheck = shouldDeactivateAccount(
        accountTier as AccountTier,
        providerConfig.totalSent || 0,
        providerConfig.totalBounces || 0,
        providerConfig.totalComplaints || 0
      );
      
      if (healthCheck.deactivate) {
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ isActive: false, updatedAt: new Date().toISOString() })
          .eq('provider', providerId);
        
        logger.error(`[AutoDeactivation] Conta ${providerId} desativada: ${healthCheck.reason}`);
        return { ok: false, reason: healthCheck.reason, providerId, providerConfig, accountTier };
      }

      // Verificar limite diário com warmup
      const now = new Date();
      const lastReset = new Date(providerConfig.lastResetAt);
      const isNewDay = now.toDateString() !== lastReset.toDateString();

      if (isNewDay) {
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ sentToday: 0, lastResetAt: now.toISOString(), updatedAt: now.toISOString() })
          .eq('provider', providerId);
      } else {
        const effectiveLimit = getEffectiveDailyLimit(
          providerConfig.dailyLimit,
          accountTier as AccountTier,
          new Date(providerConfig.warmupStartedAt || providerConfig.createdAt)
        );

        // Buscar sentToday atualizado (pode ter mudado desde que selecionamos)
        const { data: freshConfig } = await supabaseAdmin
          .from('ProviderConfig')
          .select('sentToday')
          .eq('provider', providerId)
          .single();

        const currentSent = freshConfig?.sentToday || 0;
        
        if (currentSent >= effectiveLimit) {
          logger.info(`[WarmupThrottle] ${providerId} (${accountTier}): ${currentSent}/${effectiveLimit} — tentando outro provedor`);
          // Lançar erro para que Inngest faça retry — ESTE step não é memoizado então
          // o retry vai chamar selectProviderForSend() novamente (pode pegar outro provedor)
          throw new Error(`Provider ${providerId} at daily limit (${currentSent}/${effectiveLimit}). Retrying with another.`);
        }
      }

      // Gravar provedor selecionado
      await supabaseAdmin
        .from('CampaignContact')
        .update({ usedProvider: providerId })
        .eq('id', campaignContactId);

      return { ok: true, providerId, providerConfig, accountTier };
    });

    if (!providerResult.ok) {
      return { skipped: true, reason: `Account issue: ${(providerResult as any).reason}` };
    }

    const { providerId, providerConfig, accountTier } = providerResult as {
      ok: true;
      providerId: string;
      providerConfig: any;
      accountTier: string;
    };

    logger.info(`[Roleta] Email para ${contact.email} → Provedor: ${providerId}`);

    // 4. DELAY DE WARMUP — Espaçar envios para parecer comportamento humano
    const delaySec = getSendDelay(accountTier as AccountTier);
    await step.sleep("warmup-send-delay", `${delaySec}s`);

    // 5. Buscar step config para A/B testing
    const stepConfig = await step.run("fetch-step-config", async () => {
      if (!campaignContact.currentStepId) return null;
      const { data } = await supabaseAdmin
        .from('CampaignStep')
        .select('*')
        .eq('id', campaignContact.currentStepId)
        .single();
      return data;
    });

    // 6. Lógica de A/B Testing
    let selectedSubject = subject;
    let selectedHtml = htmlBody;

    if (stepConfig?.isABTest) {
      let variant = campaignContact.abVariant;
      
      if (!variant) {
        variant = Math.random() > 0.5 ? "B" : "A";
        await step.run("assign-ab-variant", async () => {
          await supabaseAdmin
            .from('CampaignContact')
            .update({ abVariant: variant })
            .eq('id', campaignContactId);
        });
      }

      if (variant === "B" && stepConfig.htmlBodyB) {
        selectedSubject = stepConfig.subjectB || subject;
        selectedHtml = stepConfig.htmlBodyB;
      }
    }

    // 7. Renderização Final de Variáveis + URL de Unsubscribe
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
      return rewriteLinks({
        html: renderedHtml,
        campaignContactId,
        baseUrl: BASE_URL
      });
    });

    // 8. Disparo via SDK do Provedor selecionado pela roleta
    const result = await step.run("send-via-provider", async () => {
      const provider = await getEmailProvider(providerId);
      return provider.send({
        to: contact.email,
        from: providerConfig.fromEmail,
        fromName: providerConfig.fromName,
        subject: renderedSubject,
        html: trackedHtml,
        text: textBody,
        replyTo: providerConfig.fromEmail,
        unsubscribeUrl,
        contactId: contact.id,
      });
    });

    if (!result.success) {
      const isBlocked = (result as any).accountBlocked;
      const isPermanentFailure = result.error?.toLowerCase().includes('bounce') || 
                                 result.error?.toLowerCase().includes('rejected') ||
                                 result.error?.toLowerCase().includes('denied') ||
                                 result.error?.toLowerCase().includes('not found');
      
      if (isBlocked) {
        await step.run("deactivate-blocked-account", async () => {
          await supabaseAdmin
            .from('ProviderConfig')
            .update({ isActive: false, updatedAt: new Date().toISOString() })
            .eq('provider', providerId);
          
          logger.error(`[AccountBlocked] Conta ${providerId} desativada: ${result.error}`);
        });
      }

      // Registrar bounce APENAS se for erro real de entrega
      if (isPermanentFailure) {
        await step.run("record-bounce", async () => {
          await recordSendResult(providerId, "bounced");
        });
      }
      
      logger.error(`Falha no envio via ${providerId}`, result.error, { contactId, campaignContactId });
      throw new Error(`Falha no envio via ${providerId}: ${result.error}`);
    }

    // 9. ATUALIZAR STATUS DO CAMPAIGNCONTACT (separado do incremento)
    await step.run("update-campaign-contact", async () => {
      const isSMTP = providerConfig?.providerType === 'SMTP';
      const finalStatus = isSMTP ? "DELIVERED" : "SENT";
      const now = new Date().toISOString();
      
      await supabaseAdmin
        .from('CampaignContact')
        .update({
          stepStatus: finalStatus,
          lastMessageId: result.messageId,
          lastSentAt: now,
          usedProvider: providerId,
        })
        .eq('id', campaignContactId);
    });

    // 10. REGISTRAR EVENTOS E CONTADORES (separado para não duplicar status)
    await step.run("record-events", async () => {
      const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      const isSMTP = providerConfig?.providerType === 'SMTP';
      
      const promises: PromiseLike<any>[] = [
        // Registrar evento SENT
        supabaseAdmin.from('EmailEvent').insert({
          id: generateId(),
          externalId: result.messageId || `sent_${campaignContactId}_${Date.now()}`,
          contactId: contact.id,
          messageId: result.messageId || 'direct-send',
          provider: providerId,
          eventType: "SENT",
          timestamp: now,
        }),
        // Registrar envio no warmup
        recordSendResult(providerId, "sent"),
      ];

      // Para SMTP, registrar também DELIVERED
      if (isSMTP) {
        promises.push(
          supabaseAdmin.from('EmailEvent').insert({
            id: generateId(),
            externalId: `delivered_${campaignContactId}_${Date.now()}`,
            contactId: contact.id,
            messageId: result.messageId || 'direct-send',
            provider: providerId,
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
      await incrementProviderSendCount(providerId);
    });

    return { 
      success: true, 
      messageId: result.messageId, 
      provider: providerId,
      accountTier,
      delaySec
    };
  }
);
