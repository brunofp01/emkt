/**
 * Inngest Function — Envio de email via provedor vinculado (Hardened).
 */
import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEmailProvider } from "@/features/email/providers";
import { renderTemplate } from "@/features/email/lib/template-renderer";
import { incrementProviderSendCount } from "@/features/email/lib/provider-selector";
import { rewriteLinks } from "@/features/email/lib/link-tracker";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mktemail.vercel.app';

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

    // 1. Buscar contato e configurações (Bypass RLS para velocidade e segurança)
    const { contact, providerConfig } = await step.run("fetch-requirements", async () => {
      const [{ data: contact }, { data: campaignContact }] = await Promise.all([
        supabaseAdmin.from('Contact').select('*').eq('id', contactId).single(),
        supabaseAdmin.from('CampaignContact').select('isPaused, stepStatus').eq('id', campaignContactId).single()
      ]);

      if (!contact) throw new Error("Contact not found");
      
      // Validação de segurança/entregabilidade
      if (contact.status !== 'ACTIVE') {
        return { skipped: true, reason: `Contact status is ${contact.status}` };
      }

      if (!campaignContact || campaignContact.isPaused || campaignContact.stepStatus === 'UNSUBSCRIBED') {
        return { skipped: true, reason: "Campaign contact is invalid or paused" };
      }

      const { data: config } = await supabaseAdmin
        .from('ProviderConfig')
        .select('*')
        .eq('provider', contact.provider)
        .single();

      return { contact, providerConfig: config };
    }) as any;

    if (contact?.skipped) return contact;

    // 2. Renderização e Tracking
    const templateVars = {
      contactId: contact.id,
      contactName: contact.name ?? "",
      contactEmail: contact.email,
      contactCompany: contact.company ?? "",
    };

    const renderedHtml = renderTemplate(htmlBody, templateVars);
    const renderedSubject = renderTemplate(subject, templateVars);

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
      throw new Error(`Falha no envio via ${contact.provider}: ${result.error}`);
    }

    // 4. Persistência de Resultados (Atômico)
    await step.run("finalize-send", async () => {
      await Promise.all([
        supabaseAdmin
          .from('CampaignContact')
          .update({
            stepStatus: "SENT",
            lastMessageId: result.messageId,
            lastSentAt: new Date().toISOString(),
          })
          .eq('id', campaignContactId),
        
        incrementProviderSendCount(contact.provider)
      ]);
    });

    return { success: true, messageId: result.messageId, provider: contact.provider };
  }
);
