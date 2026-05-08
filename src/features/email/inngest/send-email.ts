/**
 * Inngest Function — Envio de email via provedor vinculado.
 * 
 * VERSÃO DELIVERABILITY — Inclui:
 *   - Delay aleatório (jitter) entre envios baseado no tier da conta
 *   - Verificação de warmup e limites efetivos
 *   - Headers RFC de conformidade (List-Unsubscribe, Message-ID)
 *   - Auto-geração de text/plain
 *   - Detecção e desativação automática de contas comprometidas
 *   - Tracking de reputação por conta
 */
import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEmailProvider } from "@/features/email/providers";
import { renderTemplate, generateUnsubscribeUrl } from "@/features/email/lib/template-renderer";
import { incrementProviderSendCount } from "@/features/email/lib/provider-selector";
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
    name: "Send Email via Provider",
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

    // 1. Buscar contato, etapa e configurações (Hardened)
    const { contact, campaignContact, stepConfig, providerConfig } = await step.run("fetch-requirements", async () => {
      const [{ data: contact }, { data: campaignContact }] = await Promise.all([
        supabaseAdmin.from('Contact').select('*').eq('id', contactId).single(),
        supabaseAdmin.from('CampaignContact').select('isPaused, stepStatus, abVariant, currentStepId').eq('id', campaignContactId).single()
      ]);

      if (!contact || !campaignContact) throw new Error("Contact or CampaignContact not found");
      
      // Validação de segurança/entregabilidade
      if (contact.status !== 'ACTIVE') {
        return { skipped: true, reason: `Contact status is ${contact.status}` };
      }

      const [{ data: stepData }, { data: config }] = await Promise.all([
        supabaseAdmin.from('CampaignStep').select('*').eq('id', campaignContact.currentStepId).single(),
        supabaseAdmin.from('ProviderConfig').select('*').eq('provider', contact.provider).single()
      ]);

      return { contact, campaignContact, stepConfig: stepData, providerConfig: config };
    }) as any;

    if (contact?.skipped) return contact;

    // 2. Verificar tier e atualizar se necessário
    const accountTier = await step.run("check-account-tier", async () => {
      return checkAndUpdateTier(contact.provider);
    });

    // 3. Verificar se a conta deve ser desativada por reputação
    const healthCheck = await step.run("check-account-health", async () => {
      if (!providerConfig) return { ok: false, reason: "Provider config not found" };
      
      const check = shouldDeactivateAccount(
        accountTier as AccountTier,
        providerConfig.totalSent || 0,
        providerConfig.totalBounces || 0,
        providerConfig.totalComplaints || 0
      );
      
      if (check.deactivate) {
        // Desativar conta automaticamente
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ isActive: false, updatedAt: new Date().toISOString() })
          .eq('provider', contact.provider);
        
        logger.error(`[AutoDeactivation] Conta ${contact.provider} desativada: ${check.reason}`);
        return { ok: false, reason: check.reason };
      }
      
      return { ok: true };
    });

    if (!healthCheck.ok) {
      return { skipped: true, reason: `Account deactivated: ${(healthCheck as any).reason}` };
    }

    // 4. Verificar limites diários com warmup
    const canSend = await step.run("check-daily-limit-warmup", async () => {
      if (!providerConfig) return false;
      
      const now = new Date();
      const lastReset = new Date(providerConfig.lastResetAt);
      const isNewDay = now.toDateString() !== lastReset.toDateString();

      if (isNewDay) {
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ sentToday: 0, lastResetAt: now.toISOString(), updatedAt: now.toISOString() })
          .eq('provider', contact.provider);
        return true;
      }

      // Calcular limite efetivo baseado no tier e tempo de warmup
      const effectiveLimit = getEffectiveDailyLimit(
        providerConfig.dailyLimit,
        accountTier as AccountTier,
        new Date(providerConfig.warmupStartedAt || providerConfig.createdAt)
      );

      const currentSent = providerConfig.sentToday || 0;
      
      if (currentSent >= effectiveLimit) {
        logger.info(`[WarmupThrottle] Conta ${contact.provider} (${accountTier}): ${currentSent}/${effectiveLimit} — limite atingido`);
        return false;
      }

      return true;
    });

    if (!canSend) {
      // Re-enfileirar para o próximo dia se o limite estourou
      await step.sleep("wait-for-daily-reset", "24h");
      throw new Error(`Daily limit reached for provider ${contact.provider} (${accountTier}). Retrying tomorrow.`);
    }

    // 5. DELAY DE WARMUP — Espaçar envios para parecer comportamento humano
    const delaySec = getSendDelay(accountTier as AccountTier);
    await step.sleep("warmup-send-delay", `${delaySec}s`);

    // 6. Lógica de A/B Testing
    let selectedSubject = subject;
    let selectedHtml = htmlBody;

    if (stepConfig?.isABTest) {
      let variant = campaignContact.abVariant;
      
      if (!variant) {
        variant = Math.random() > 0.5 ? "B" : "A";
        await supabaseAdmin
          .from('CampaignContact')
          .update({ abVariant: variant })
          .eq('id', campaignContactId);
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

    const renderedSubject = renderTemplate(selectedSubject, templateVars);
    const renderedHtml = renderTemplate(selectedHtml, templateVars);

    const trackedHtml = await step.run("apply-link-tracking", async () => {
      return rewriteLinks({
        html: renderedHtml,
        campaignContactId,
        baseUrl: BASE_URL
      });
    });

    // 8. Disparo via SDK do Provedor (com headers de deliverability)
    const result = await step.run("send-via-provider", async () => {
      const provider = await getEmailProvider(contact.provider);
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
      // Verificar se a conta foi bloqueada pelo Gmail
      const isBlocked = (result as any).accountBlocked;
      
      if (isBlocked) {
        await step.run("deactivate-blocked-account", async () => {
          await supabaseAdmin
            .from('ProviderConfig')
            .update({ isActive: false, updatedAt: new Date().toISOString() })
            .eq('provider', contact.provider);
          
          logger.error(`[AccountBlocked] Conta ${contact.provider} desativada: ${result.error}`);
        });
      }

      // Registrar bounce
      await recordSendResult(contact.provider, "bounced");
      
      logger.error(`Falha no envio via ${contact.provider}`, result.error, { contactId, campaignContactId });
      throw new Error(`Falha no envio via ${contact.provider}: ${result.error}`);
    }

    // 9. Persistência de Resultados + Tracking de Reputação
    await step.run("finalize-send", async () => {
      const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await Promise.all([
        // Atualizar status do CampaignContact
        supabaseAdmin
          .from('CampaignContact')
          .update({
            stepStatus: "SENT",
            lastMessageId: result.messageId,
            lastSentAt: new Date().toISOString(),
          })
          .eq('id', campaignContactId),
        
        // Registrar evento SENT na tabela EmailEvent (independente de webhook)
        supabaseAdmin.from('EmailEvent').insert({
          id: generateId(),
          externalId: result.messageId || `sent_${campaignContactId}_${Date.now()}`,
          contactId: contact.id,
          messageId: result.messageId || 'direct-send',
          provider: contact.provider,
          eventType: "SENT",
          timestamp: new Date().toISOString(),
        }),
        
        // Incrementar contador diário
        incrementProviderSendCount(contact.provider),
        
        // Registrar envio bem-sucedido no warmup engine
        recordSendResult(contact.provider, "sent"),
      ]);
    });

    return { 
      success: true, 
      messageId: result.messageId, 
      provider: contact.provider,
      accountTier,
      delaySec
    };
  }
);
