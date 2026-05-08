/**
 * Adaptador para o provedor Gmail (SMTP via Nodemailer).
 * Usa "Senha de App" do Google para autenticação segura.
 * Docs: https://support.google.com/accounts/answer/185833
 * 
 * Limites: 500 emails/dia (pessoal) | 2000 emails/dia (Workspace)
 */
import nodemailer from "nodemailer";
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "",
    pass: process.env.GMAIL_APP_PASSWORD || "",
  },
});

export const gmailProvider: EmailProviderAdapter = {
  name: "GMAIL" as any,

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const info = await transporter.sendMail({
        from: `${params.fromName} <${process.env.GMAIL_USER}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Gmail error";
      return { success: false, error: message };
    }
  },
};
