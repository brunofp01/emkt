/**
 * Template Renderer — Renderiza templates de email com variáveis dinâmicas.
 * 
 * Suporta variáveis no formato {{nome_variavel}} dentro do HTML e subject.
 */

/** Variáveis disponíveis para templates */
export interface TemplateVariables {
  contactName?: string;
  contactEmail: string;
  contactCompany?: string;
  campaignName?: string;
  unsubscribeUrl?: string;
  [key: string]: string | undefined;
}

/**
 * Substitui variáveis {{key}} no template pelo valor correspondente.
 * Variáveis não encontradas são substituídas por string vazia.
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value ?? "";
  });
}

/**
 * Gera a URL de unsubscribe para um contato.
 */
export function generateUnsubscribeUrl(contactId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/unsubscribe?id=${contactId}`;
}
