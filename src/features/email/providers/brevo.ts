/**
 * Adaptador para o provedor Brevo (ex-Sendinblue).
 * Usa fetch direto na API v3 (SDK oficial tem tipagem inconsistente).
 * Docs: https://developers.brevo.com/docs
 */
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export const brevoProvider: EmailProviderAdapter = {
  name: "BREVO",

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY!,
        },
        body: JSON.stringify({
          sender: { name: params.fromName, email: params.from },
          to: [{ email: params.to }],
          subject: params.subject,
          htmlContent: params.html,
          textContent: params.text,
          replyTo: params.replyTo ? { email: params.replyTo } : undefined,
          tags: params.tags ? Object.keys(params.tags) : undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, error: `Brevo API error: ${response.status} - ${errorBody}` };
      }

      const data = (await response.json()) as { messageId?: string };
      return { success: true, messageId: data.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Brevo error";
      return { success: false, error: message };
    }
  },
};
