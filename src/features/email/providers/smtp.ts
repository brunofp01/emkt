/**
 * Adaptador Genérico SMTP (Nodemailer).
 * Utilizado para contas Gmail ou qualquer outro provedor SMTP dinâmico
 * cadastrado no banco de dados.
 */
import nodemailer from "nodemailer";
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";

export function createSmtpProvider(
  providerId: string, 
  smtpHost: string, 
  smtpPort: number, 
  smtpUser: string, 
  smtpPass: string
): EmailProviderAdapter {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return {
    name: providerId,
    async send(params: SendEmailParams): Promise<SendEmailResult> {
      try {
        const info = await transporter.sendMail({
          from: `${params.fromName} <${params.from}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          replyTo: params.replyTo,
        });

        return { success: true, messageId: info.messageId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown SMTP error";
        return { success: false, error: message };
      }
    },
  };
}
