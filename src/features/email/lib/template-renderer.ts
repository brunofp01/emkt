/**
 * Template Renderer — Renderiza templates de email com variáveis dinâmicas e footer de compliance.
 */

/** Variáveis disponíveis para templates */
export interface TemplateVariables {
  contactId?: string;
  contactName?: string;
  contactEmail: string;
  contactCompany?: string;
  campaignName?: string;
  unsubscribeUrl?: string;
  [key: string]: string | undefined;
}

/**
 * Substitui variáveis {{key}} no template pelo valor correspondente.
 * Adiciona automaticamente o rodapé de descadastro para conformidade mundial (LGPD/CAN-SPAM).
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  // 1. Substituição de variáveis
  let rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value ?? "";
  });

  // 2. Adição automática de Footer de Compliance (Fase 4)
  if (variables.contactId && !rendered.includes('unsubscribe')) {
    const unsubUrl = generateUnsubscribeUrl(variables.contactId);
    const footer = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; font-family: sans-serif; font-size: 12px; color: #999999; text-align: center;">
        <p>Este e-mail foi enviado para ${variables.contactEmail}.</p>
        <p>
          Se você não deseja mais receber esses e-mails, você pode 
          <a href="${unsubUrl}" style="color: #666666; text-decoration: underline;">sair da lista</a> a qualquer momento.
        </p>
        <p>© 2026 MailPulse Marketing Automation</p>
      </div>
    `;
    
    // Inserir antes do fechamento do body se existir, senão apenas apenda
    if (rendered.includes('</body>')) {
      rendered = rendered.replace('</body>', `${footer}</body>`);
    } else {
      rendered += footer;
    }
  }

  return rendered;
}

/**
 * Gera a URL de unsubscribe pública para um contato.
 */
export function generateUnsubscribeUrl(contactId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mktemail.vercel.app";
  return `${baseUrl}/unsubscribe/${contactId}`;
}
