/**
 * Provider Factory — Retorna o adaptador correto com base no enum do provedor.
 * 
 * Este é o ponto central de roteamento: dado um EmailProvider,
 * retorna a implementação correta para envio de email.
 */
import type { EmailProviderAdapter } from "@/shared/types";
import { brevoProvider } from "./brevo";
import { createSmtpProvider } from "./smtp";
import { createMailrelayProvider } from "./mailrelay";
import { supabaseAdmin } from "@/shared/lib/supabase";

/**
 * Retorna o adaptador de email correto baseado na configuração do provedor no banco.
 * Para APIs como o Brevo, retorna a instância estática.
 * Para Mailrelay, cria instância dinâmica com subdomínio + API key.
 * Para contas SMTP, cria uma instância dinamicamente usando as credenciais.
 */
export async function getEmailProvider(providerId: string): Promise<EmailProviderAdapter> {
  const { data: config } = await supabaseAdmin
    .from('ProviderConfig')
    .select('*')
    .eq('provider', providerId)
    .single();

  if (!config) {
    throw new Error(`Configuração não encontrada para o provedor: ${providerId}`);
  }

  // Se for o Brevo (API fixo que restou)
  if (config.providerType === "API_BREVO") {
    return brevoProvider;
  }

  // Se for o Mailrelay (API REST v1)
  if (config.providerType === "API_MAILRELAY") {
    const apiKey = process.env.MAILRELAY_API_KEY;
    const subdomain = process.env.MAILRELAY_SUBDOMAIN;
    if (!apiKey || !subdomain) {
      throw new Error("MAILRELAY_API_KEY e MAILRELAY_SUBDOMAIN devem estar configurados no .env");
    }
    return createMailrelayProvider(subdomain, apiKey);
  }

  // Para qualquer outro, assumimos que é SMTP
  if (config.providerType === "SMTP" && config.smtpHost && config.smtpUser && config.smtpPass) {
    return createSmtpProvider(
      providerId,
      config.smtpHost,
      config.smtpPort || 587,
      config.smtpUser,
      config.smtpPass
    );
  }

  throw new Error(`Tipo de provedor não suportado ou credenciais ausentes: ${config.providerType}`);
}
