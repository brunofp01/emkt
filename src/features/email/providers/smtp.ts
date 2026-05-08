/**
 * Adaptador Genérico SMTP (Nodemailer) — Versão Deliverability.
 * 
 * Utilizado para contas Gmail ou qualquer outro provedor SMTP dinâmico
 * cadastrado no banco de dados.
 * 
 * Headers de conformidade incluídos:
 *   - List-Unsubscribe + List-Unsubscribe-Post (RFC 8058, obrigatório Google 2024+)
 *   - Message-ID com domínio real (evita hostname local no ID)
 *   - Precedence: bulk (identificação correta como email em massa)
 *   - Auto-geração de text/plain quando não fornecido
 */
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";
import { htmlToText } from "@/features/email/lib/html-to-text";

/** Domínio usado para gerar Message-IDs e identificar o sistema */
const MAIL_DOMAIN = "mktemail.vercel.app";

export function createSmtpProvider(
  providerId: string, 
  smtpHost: string, 
  smtpPort: number, 
  smtpUser: string, 
  smtpPass: string
): EmailProviderAdapter {
  const transportOptions: SMTPTransport.Options = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  };

  const transporter = nodemailer.createTransport(transportOptions);

  return {
    name: providerId,
    async send(params: SendEmailParams): Promise<SendEmailResult> {
      try {
        // Gerar Message-ID único com domínio real
        const uniqueId = crypto.randomUUID();
        const messageId = `<${uniqueId}@${MAIL_DOMAIN}>`;

        // Gerar text/plain automaticamente se não fornecido
        const textContent = params.text || htmlToText(params.html);

        // Montar headers de conformidade
        const headers: Record<string, string> = {
          // Identificação como bulk mail (padrão da indústria)
          "Precedence": "bulk",
          // Message-ID com domínio real (crítico para deliverability)
          "Message-ID": messageId,
          // Feedback-ID para rastreio no Google Postmaster Tools
          "Feedback-ID": `${providerId}:mailpulse:${MAIL_DOMAIN}`,
        };

        // Headers de Unsubscribe (RFC 8058 — obrigatório pelo Google desde fev/2024)
        if (params.unsubscribeUrl) {
          headers["List-Unsubscribe"] = `<${params.unsubscribeUrl}>`;
          headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
        }

        const info = await transporter.sendMail({
          from: `${params.fromName} <${params.from}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: textContent,
          replyTo: params.replyTo || params.from,
          messageId: messageId,
          headers,
        });

        return { success: true, messageId: info.messageId || messageId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown SMTP error";
        
        // Detectar erros específicos de conta bloqueada pelo Gmail
        const isAccountBlocked = message.includes("Account disabled") || 
                                  message.includes("too many login attempts") ||
                                  message.includes("Username and Password not accepted") ||
                                  message.includes("SMTP error 535") ||
                                  message.includes("Daily user sending limit exceeded");
        
        return { 
          success: false, 
          error: message,
          // Flag para o caller saber que deve desativar a conta
          ...(isAccountBlocked && { accountBlocked: true }),
        } as SendEmailResult & { accountBlocked?: boolean };
      }
    },
  };
}
