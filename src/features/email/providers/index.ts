/**
 * Provider Factory — Retorna o adaptador correto com base no enum do provedor.
 * 
 * Este é o ponto central de roteamento: dado um EmailProvider,
 * retorna a implementação correta para envio de email.
 */
import type { EmailProvider, EmailProviderAdapter } from "@/shared/types";
import { resendProvider } from "./resend";
import { usesendProvider } from "./usesend";
import { brevoProvider } from "./brevo";
import { mailgunProvider } from "./mailgun";

const providers: Record<EmailProvider, EmailProviderAdapter> = {
  RESEND: resendProvider,
  USESEND: usesendProvider,
  BREVO: brevoProvider,
  MAILGUN: mailgunProvider,
};

/**
 * Retorna o adaptador de email correto para o provedor informado.
 * @throws Error se o provedor não for suportado
 */
export function getEmailProvider(provider: EmailProvider): EmailProviderAdapter {
  const adapter = providers[provider];
  if (!adapter) {
    throw new Error(`Provedor de email não suportado: ${provider}`);
  }
  return adapter;
}

/** Lista todos os provedores disponíveis */
export function getAllProviders(): EmailProviderAdapter[] {
  return Object.values(providers);
}
