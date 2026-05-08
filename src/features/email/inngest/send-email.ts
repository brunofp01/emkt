/**
 * Inngest Function — Envio de email via ROLETA de provedores.
 * 
 * VERSÃO ROLETA — O provedor é selecionado no momento do envio,
 * não mais vinculado ao contato. Cada email passa pela roleta
 * de provedores ativos com capacidade disponível.
 * 
 * Inclui:
 *   - Seleção dinâmica de provedor via roleta ponderada
 *   - Delay aleatório (jitter) entre envios baseado no tier da conta
 *   - Verificação de warmup e limites efetivos
 *   - Headers RFC de conformidade (List-Unsubscribe, Message-ID)
 *   - Auto-geração de text/plain
 *   - Detecção e desativação automática de contas comprometidas
 *   - Tracking de reputação por conta
 *   - Gravação do provedor usado em CampaignContact.usedProvider
 */
import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEmailProvider } from "@/features/email/providers";
import { renderTemplate, renderSubject, generateUnsubscribeUrl } from "@/features/email/lib/template-renderer";
import { selectProviderForSend, incrementProviderSendCount } from "@/features/email/lib/provider-selector";
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

    // 3. ROLETA: Selecionar provedor dinamicamente
    const { providerId, providerConfig } = await step.run("select-provider-rotation", async () => {
      return selectProviderForSend();
    });

    logger.info(`[Roleta] Email para ${contact.email} → Provedor: ${providerId}`);

    // 4. Gravar provedor selecionado no CampaignContact
    await step.run("save-used-provider", async () => {
      await supabaseAdmin
        .from('CampaignContact')
        .update({ usedProvider: providerId })
        .eq('id', campaignContactId);
    });

    // 5. Verificar tier e atualizar se necessário
    const accountTier = await step.run("check-account-tier", async () => {
      return checkAndUpdateTier(providerId);
    });

    // 6. Verificar se a conta deve ser desativada por reputação
    const healthCheck = await step.run("check-account-health", async () => {
      const check = shouldDeactivateAccount(
        accountTier as AccountTier,
        providerConfig.totalSent || 0,
        providerConfig.totalBounces || 0,
        providerConfig.totalComplaints || 0
      );
      
      if (check.deactivate) {
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ isActive: false, updatedAt: new Date().toISOString() })
          .eq('provider', providerId);
        
        logger.error(`[AutoDeactivation] Conta ${providerId} desativada: ${check.reason}`);
        return { ok: false, reason: check.reason };
      }
      
      return { ok: true };
    });

    if (!healthCheck.ok) {
      return { skipped: true, reason: `Account deactivated: ${(healthCheck as any).reason}` };
    }

    // 7. Verificar limites diários com warmup
    const canSend = await step.run("check-daily-limit-warmup", async () => {
      const now = new Date();
      const lastReset = new Date(providerConfig.lastResetAt);
      const isNewDay = now.toDateString() !== lastReset.toDateString();

      if (isNewDay) {
        await supabaseAdmin
          .from('ProviderConfig')
          .update({ sentToday: 0, lastResetAt: now.toISOString(), updatedAt: now.toISOString() })
          .eq('provider', providerId);
        return true;
      }

      const effectiveLimit = getEffectiveDailyLimit(
        providerConfig.dailyLimit,
        accountTier as AccountTier,
        new Date(providerConfig.warmupStartedAt || providerConfig.createdAt)
      );

      const currentSent = providerConfig.sentToday || 0;
      
      if (currentSent >= effectiveLimit) {
        logger.info(`[WarmupThrottle] Conta ${providerId} (${accountTier}): ${currentSent}/${effectiveLimit} — limite atingido`);
        return false;
      }

      return true;
    });

    if (!canSend) {
      await step.sleep("wait-for-daily-reset", "24h");
      throw new Error(`Daily limit reached for provider ${providerId} (${accountTier}). Retrying tomorrow.`);
    }

    // 8. DELAY DE WARMUP — Espaçar envios para parecer comportamento humano
    const delaySec = getSendDelay(accountTier as AccountTier);
    await step.sleep("warmup-send-delay", `${delaySec}s`);

    // 9. Buscar step config para A/B testing
    const stepConfig = await step.run("fetch-step-config", async () => {
      if (!campaignContact.currentStepId) return null;
      const { data } = await supabaseAdmin
        .from('CampaignStep')
        .select('*')
        .eq('id', campaignContact.currentStepId)
        .single();
      return data;
    });

    // 10. Lógica de A/B Testing
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

    // 11. Renderização Final de Variáveis + URL de Unsubscribe
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

    // 12. Disparo via SDK do Provedor selecionado pela roleta
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
      
      if (isBlocked) {
        await step.run("deactivate-blocked-account", async () => {
          await supabaseAdmin
            .from('ProviderConfig')
            .update({ isActive: false, updatedAt: new Date().toISOString() })
            .eq('provider', providerId);
          
          logger.error(`[AccountBlocked] Conta ${providerId} desativada: ${result.error}`);
        });
      }

      await recordSendResult(providerId, "bounced");
      
      logger.error(`Falha no envio via ${providerId}`, result.error, { contactId, campaignContactId });
      throw new Error(`Falha no envio via ${providerId}: ${result.error}`);
    }

    // 13. Persistência de Resultados + Tracking de Reputação
    await step.run("finalize-send", async () => {
      const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      
      const isSMTP = providerConfig?.providerType === 'SMTP';
      const finalStatus = isSMTP ? "DELIVERED" : "SENT";
      
      const operations = [
        // Atualizar status do CampaignContact
        supabaseAdmin
          .from('CampaignContact')
          .update({
            stepStatus: finalStatus,
            lastMessageId: result.messageId,
            lastSentAt: now,
            usedProvider: providerId,
          })
          .eq('id', campaignContactId),
        
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
        
        // Incrementar contador diário
        incrementProviderSendCount(providerId),
        
        // Registrar envio bem-sucedido no warmup engine
        recordSendResult(providerId, "sent"),
      ];

      // Para SMTP, registrar também evento DELIVERED automaticamente
      if (isSMTP) {
        operations.push(
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

      await Promise.all(operations);
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
