// @ts-nocheck
/**
 * Inngest Function — Envio de email via provedor vinculado.
 * 
 * Disparada pelo evento "email/send". Busca o contato, determina o provedor
 * vinculado e envia o email. Retries automáticos (3x) pelo mesmo provedor.
 */
import { inngest } from "@/shared/lib/inngest";
import { prisma } from "@/shared/lib/prisma";
import { getEmailProvider } from "@/features/email/providers";
import { renderTemplate } from "@/features/email/lib/template-renderer";
import { incrementProviderSendCount } from "@/features/email/lib/provider-selector";

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

    // Step 1: Buscar contato e config do provedor
    const contact = await step.run("fetch-contact", async () => {
      return prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
    });

    const providerConfig = await step.run("fetch-provider-config", async () => {
      return prisma.providerConfig.findUniqueOrThrow({
        where: { provider: contact.provider },
      });
    });

    // Step 2: Renderizar template
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

    // Step 3: Enviar via provedor vinculado
    const result = await step.run("send-via-provider", async () => {
      const provider = getEmailProvider(contact.provider);
      return provider.send({
        to: contact.email,
        from: providerConfig.fromEmail,
        fromName: providerConfig.fromName,
        subject: renderedSubject,
        html: renderedHtml,
        text: textBody,
      });
    });

    if (!result.success) {
      throw new Error(`Falha no envio via ${contact.provider}: ${result.error}`);
    }

    // Step 4: Atualizar CampaignContact com messageId
    await step.run("update-campaign-contact", async () => {
      await prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: {
          stepStatus: "SENT",
          lastMessageId: result.messageId,
          lastSentAt: new Date(),
        },
      });
      await incrementProviderSendCount(contact.provider);
    });

    return { success: true, messageId: result.messageId, provider: contact.provider };
  }
);
