/**
 * Adaptador para o provedor Mailgun.
 * SDK: mailgun.js (npm)
 * Docs: https://documentation.mailgun.com
 */
import Mailgun from "mailgun.js";
import FormData from "form-data";
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "dummy",
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;

export const mailgunProvider: EmailProviderAdapter = {
  name: "MAILGUN",

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const result = await mg.messages.create(MAILGUN_DOMAIN, {
        from: `${params.fromName} <${params.from}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        "h:Reply-To": params.replyTo,
        "o:tag": params.tags ? Object.keys(params.tags) : undefined,
      });

      return { success: true, messageId: result.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Mailgun error";
      return { success: false, error: message };
    }
  },
};
