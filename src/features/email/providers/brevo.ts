/**
 * Adaptador para o provedor Brevo (ex-Sendinblue) — Versão Deliverability.
 * Usa fetch direto na API v3 (SDK oficial tem tipagem inconsistente).
 * Docs: https://developers.brevo.com/docs
 * 
 * Inclui headers de conformidade:
 *   - List-Unsubscribe via headers da API
 *   - Auto-geração de text/plain
 */
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";
import { htmlToText } from "@/features/email/lib/html-to-text";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export const brevoProvider: EmailProviderAdapter = {
  name: "BREVO",

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      // Gerar text/plain automaticamente se não fornecido
      const textContent = params.text || htmlToText(params.html);

      // Montar headers de conformidade
      const headers: Record<string, string> = {};
      if (params.unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${params.unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }

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
          textContent: textContent,
          replyTo: params.replyTo ? { email: params.replyTo } : { email: params.from },
          tags: params.tags ? Object.keys(params.tags) : undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
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
