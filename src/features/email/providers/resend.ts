/**
 * Adaptador para o provedor Resend.
 * SDK: resend (npm)
 * Docs: https://resend.com/docs
 */
import { Resend } from "resend";
import { env } from "@/shared/lib/env";
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";

const resend = new Resend(env.RESEND_API_KEY || "re_dummy");

export const resendProvider: EmailProviderAdapter = {
  name: "RESEND",

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const { data, error } = await resend.emails.send({
        from: `${params.fromName} <${params.from}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        tags: params.tags
          ? Object.entries(params.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Resend error";
      return { success: false, error: message };
    }
  },
};
