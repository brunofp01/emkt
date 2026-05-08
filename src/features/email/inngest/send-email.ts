/**
 * Inngest Function — Envio de email via provedor vinculado (Hardened).
 */
import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEmailProvider } from "@/features/email/providers";
import { renderTemplate } from "@/features/email/lib/template-renderer";
import { incrementProviderSendCount, canProviderSendToday } from "@/features/email/lib/provider-selector";
import { rewriteLinks } from "@/features/email/lib/link-tracker";
import { env } from "@/shared/lib/env";
import { logger } from "@/shared/lib/logger";

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

    // Check daily limit (P3)
    const canSend = await step.run("check-daily-limit", async () => {
      return canProviderSendToday(contact.provider);
    });

    if (!canSend) {
      // Re-enfileirar para o próximo dia se o limite estourou
      await step.sleep("wait-for-daily-reset", "24h");
      throw new Error(`Daily limit reached for provider ${contact.provider}. Retrying tomorrow.`);
    }

    // 2. Renderização e Tracking
    // 1b. Lógica de A/B Testing (Fase 7)
    let selectedSubject = subject;
    let selectedHtml = htmlBody;

    if (stepConfig.isABTest) {
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

    // 2. Renderização Final de Variáveis
    const templateVars = {
      contactId: contact.id,
      contactName: contact.name ?? "",
      contactEmail: contact.email,
      contactCompany: contact.company ?? "",
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

    // 3. Disparo via SDK do Provedor
    const result = await step.run("send-via-provider", async () => {
      const provider = getEmailProvider(contact.provider);
      return provider.send({
        to: contact.email,
        from: providerConfig.fromEmail,
        fromName: providerConfig.fromName,
        subject: renderedSubject,
        html: trackedHtml,
        text: textBody,
      });
    });

    if (!result.success) {
      logger.error(`Falha no envio via ${contact.provider}`, result.error, { contactId, campaignContactId });
      throw new Error(`Falha no envio via ${contact.provider}: ${result.error}`);
    }

    // 4. Persistência de Resultados (Atômico)
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
        
        incrementProviderSendCount(contact.provider)
      ]);
    });

    return { success: true, messageId: result.messageId, provider: contact.provider };
  }
);
