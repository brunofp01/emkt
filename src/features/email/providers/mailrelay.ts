/**
 * Adaptador para o provedor Mailrelay — API REST v1.
 * Docs: https://{subdomain}.ipzmarketing.com/admin/api_keys
 * 
 * Utiliza a API transacional do Mailrelay para envio de emails.
 * O Mailrelay faz tracking automático de opens (pixel) e clicks (link rewrite).
 * 
 * Autenticação via header X-AUTH-TOKEN.
 * Webhooks (Event Subscriptions) configurados separadamente no painel.
 */
import type { EmailProviderAdapter, SendEmailParams, SendEmailResult } from "@/shared/types";
import { htmlToText } from "@/features/email/lib/html-to-text";

/**
 * Cria uma instância do provedor Mailrelay com subdomínio e API key dinâmicos.
 * Isso permite múltiplas contas Mailrelay no futuro.
 */
export function createMailrelayProvider(
  subdomain: string,
  apiKey: string
): EmailProviderAdapter {
  const baseUrl = `https://${subdomain}.ipzmarketing.com/api/v1`;

  return {
    name: "MAILRELAY",

    async send(params: SendEmailParams): Promise<SendEmailResult> {
      try {
        const textContent = params.text || htmlToText(params.html);
        
        // Payload mínimo absoluto
        const payload = {
          from: {
            email: params.from,
            name: params.fromName
          },
          to: [
            {
              email: params.to,
              name: params.to
            }
          ],
          subject: params.subject,
          html_part: params.html,
          text_part: textContent
        };

        const response = await fetch(`${baseUrl}/send_emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AUTH-TOKEN": apiKey
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        if (!response.ok) {
          const isBlocked = response.status === 429 || 
                            response.status === 403 ||
                            responseText.toLowerCase().includes("limit") ||
                            responseText.toLowerCase().includes("blocked");

          return { 
            success: false, 
            error: `Mailrelay API error: ${response.status} - ${responseText}`,
            accountBlocked: isBlocked
          };
        }

        const data = JSON.parse(responseText);
        const result = Array.isArray(data) ? data[0] : data;
        const messageId = result?.message_id || (result?.id ? String(result.id) : null);
        
        return { success: true, messageId: messageId || `mr-${Date.now()}` };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Mailrelay unknown error" };
      }
    }
  };
}
