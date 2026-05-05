/**
 * Adaptador para o provedor useSend (ex-Unsend).
 * SDK: usesend-js (npm)
 * Docs: https://docs.usesend.com
 */
import { UseSend } from "usesend-js";
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";

const usesend = new UseSend(process.env.USESEND_API_KEY || "dummy");

export const usesendProvider: EmailProviderAdapter = {
  name: "USESEND",

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const response = await usesend.emails.send({
        from: `${params.fromName} <${params.from}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      return {
        success: true,
        messageId: (response as { emailId?: string }).emailId ?? undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown useSend error";
      return { success: false, error: message };
    }
  },
};
