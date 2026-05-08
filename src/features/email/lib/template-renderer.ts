/**
 * Template Renderer — Renderiza templates de email com variáveis dinâmicas,
 * enforcement de estrutura HTML e footer de compliance.
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

  // 2. Adição automática de Footer de Compliance (LGPD/CAN-SPAM)
  if (variables.contactId && !rendered.includes('unsubscribe')) {
    const unsubUrl = generateUnsubscribeUrl(variables.contactId);
    const footer = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #999999; text-align: center;">
        <p style="margin: 0 0 8px;">Este e-mail foi enviado para ${variables.contactEmail}.</p>
        <p style="margin: 0 0 8px;">
          Se você não deseja mais receber esses e-mails, você pode 
          <a href="${unsubUrl}" style="color: #666666; text-decoration: underline;">sair da lista</a> a qualquer momento.
        </p>
        <p style="margin: 0; color: #cccccc;">© ${new Date().getFullYear()} MailPulse</p>
      </div>
    `;
    
    // Inserir antes do fechamento do body se existir, senão apenas apenda
    if (rendered.includes('</body>')) {
      rendered = rendered.replace('</body>', `${footer}</body>`);
    } else {
      rendered += footer;
    }
  }

  // 3. Garantir estrutura HTML válida
  rendered = ensureHtmlStructure(rendered);

  return rendered;
}

/**
 * Garante que o HTML tenha uma estrutura válida com DOCTYPE, html, head e body.
 * Filtros de spam penalizam HTML malformado.
 */
export function ensureHtmlStructure(html: string): string {
  // Se já tem DOCTYPE, assumir que está bem estruturado
  if (html.trim().toLowerCase().startsWith('<!doctype')) {
    return html;
  }

  // Se já tem <html>, adicionar apenas DOCTYPE
  if (html.includes('<html')) {
    return `<!DOCTYPE html>\n${html}`;
  }

  // Construir estrutura completa
  const hasBody = html.includes('<body');
  const hasHead = html.includes('<head');

  if (hasBody && hasHead) {
    return `<!DOCTYPE html>\n<html lang="pt-BR">\n${html}\n</html>`;
  }

  // Envolver em estrutura completa
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
${html}
</body>
</html>`;
}

/**
 * Gera a URL de unsubscribe pública para um contato.
 */
export function generateUnsubscribeUrl(contactId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mktemail.vercel.app";
  return `${baseUrl}/unsubscribe/${contactId}`;
}
