/**
 * Inngest Function — Envio de email via provedor vinculado.
 * Refatorado para usar Supabase SDK (HTTPS) e Link Tracking.
 */
import { inngest } from "@/shared/lib/inngest";
import { supabase } from "@/shared/lib/supabase";
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

    // Step 1: Buscar contato via HTTPS
    const contact = await step.run("fetch-contact", async () => {
      const { data, error } = await supabase
        .from('Contact')
        .select('*')
        .eq('id', contactId)
        .single();
      if (error) throw error;
      return data;
    });

    // Step 1b: Buscar config do provedor via HTTPS
    const providerConfig = await step.run("fetch-provider-config", async () => {
      const { data, error } = await supabase
        .from('ProviderConfig')
        .select('*')
        .eq('provider', contact.provider)
        .single();
      if (error) throw error;
      return data;
    });

    // Step 2: Renderizar template básico
    const renderedHtml = renderTemplate(htmlBody, {
      contactName: contact.name ?? "",
      contactEmail: contact.email,
      contactCompany: contact.company ?? "",
    });
    const renderedSubject = renderTemplate(subject, {
      contactName: contact.name ?? "",
      contactEmail: contact.email,
      contactCompany: contact.company ?? "",
    });

    // Step 2b: APLICAR LINK TRACKING (Fase 2)
    const trackedHtml = await step.run("apply-link-tracking", async () => {
      return rewriteLinks({
        html: renderedHtml,
        campaignContactId,
        baseUrl: BASE_URL
      });
    });

    // Step 3: Enviar via provedor vinculado
    const result = await step.run("send-via-provider", async () => {
      const provider = getEmailProvider(contact.provider);
      return provider.send({
        to: contact.email,
        from: providerConfig.fromEmail,
        fromName: providerConfig.fromName,
        subject: renderedSubject,
        html: trackedHtml, // Usando o HTML com links rastreáveis
        text: textBody,
      });
    });

    if (!result.success) {
      throw new Error(`Falha no envio via ${contact.provider}: ${result.error}`);
    }

    // Step 4: Atualizar CampaignContact com messageId via HTTPS
    await step.run("update-campaign-contact", async () => {
      const { error } = await supabase
        .from('CampaignContact')
        .update({
          stepStatus: "SENT",
          lastMessageId: result.messageId,
          lastSentAt: new Date().toISOString(),
        })
        .eq('id', campaignContactId);
      
      if (error) throw error;
      
      await incrementProviderSendCount(contact.provider);
    });

    return { success: true, messageId: result.messageId, provider: contact.provider };
  }
);
