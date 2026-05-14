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
        // Gerar text/plain automaticamente se não fornecido
        const textContent = params.text || htmlToText(params.html);

        // Montar headers de conformidade no HTML
        let finalHtml = params.html;
        if (params.unsubscribeUrl) {
          // Adicionar link de unsubscribe visível no rodapé (boas práticas)
          finalHtml += `\n<!-- List-Unsubscribe: <${params.unsubscribeUrl}> -->`;
        }

        const payload: Record<string, unknown> = {
          from: {
            email: params.from,
            name: params.fromName,
          },
          to: [
            {
              email: params.to,
              name: params.to, // Mailrelay exige "name" no destinatário
            },
          ],
          subject: params.subject,
          html_part: finalHtml,
          text_part: textContent,
        };

        // Reply-To
        if (params.replyTo) {
          payload.reply_to = { email: params.replyTo };
        }

        // Headers customizados para conformidade RFC 8058
        const customHeaders: Record<string, string> = {};
        if (params.unsubscribeUrl) {
          customHeaders["List-Unsubscribe"] = `<${params.unsubscribeUrl}>`;
          customHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
        }
        if (Object.keys(customHeaders).length > 0) {
          payload.headers = customHeaders;
        }

        const response = await fetch(`${baseUrl}/send_emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AUTH-TOKEN": apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          
          // Detectar erros de conta bloqueada / limite excedido
          const isBlocked = response.status === 429 || 
                            response.status === 403 ||
                            errorBody.toLowerCase().includes("limit") ||
                            errorBody.toLowerCase().includes("blocked") ||
                            errorBody.toLowerCase().includes("suspended");

          return { 
            success: false, 
            error: `Mailrelay API error: ${response.status} - ${errorBody}`,
            ...(isBlocked && { accountBlocked: true }),
          } as SendEmailResult & { accountBlocked?: boolean };
        }

        const data = await response.json();
        
        // Mailrelay v1 send_emails returns an array: [{"id": 123, "email": "...", ...}]
        const result = Array.isArray(data) ? data[0] : data;
        const messageId = result?.message_id || (result?.id ? String(result.id) : null);
        
        return { success: true, messageId: messageId || `mr-${Date.now()}` };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Mailrelay error";
        return { success: false, error: message };
      }
    },
  };
}
