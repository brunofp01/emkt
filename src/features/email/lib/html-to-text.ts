/**
 * HTML-to-Text — Converte HTML para texto puro para a parte text/plain do email.
 * 
 * Emails MIME multipart com text/plain + text/html recebem melhor pontuação
 * dos filtros anti-spam. Este módulo gera a versão text/plain automaticamente
 * quando o usuário não fornece uma.
 */

/**
 * Converte HTML para texto puro legível.
 * Remove tags, preserva estrutura de parágrafos e links.
 */
export function htmlToText(html: string): string {
  if (!html) return "";

  let text = html;

  // Preservar quebras de linha de elementos de bloco
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Converter links para formato texto: "texto (url)"
  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, url, label) => {
    const cleanLabel = label.replace(/<[^>]*>/g, "").trim();
    if (!cleanLabel || cleanLabel === url) return url;
    return `${cleanLabel} (${url})`;
  });

  // Converter listas
  text = text.replace(/<li[^>]*>/gi, "• ");

  // Converter headers para texto com ênfase
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_, content) => {
    const clean = content.replace(/<[^>]*>/g, "").trim();
    return `\n${clean.toUpperCase()}\n`;
  });

  // Remover tags de estilo e script completamente (incluindo conteúdo)
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // Remover todas as tags restantes
  text = text.replace(/<[^>]*>/g, "");

  // Decodificar entidades HTML comuns
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&copy;/g, "©");
  text = text.replace(/&reg;/g, "®");
  text = text.replace(/&trade;/g, "™");

  // Limpar espaços extras
  text = text.replace(/[ \t]+/g, " ");           // Múltiplos espaços → um
  text = text.replace(/\n[ \t]+/g, "\n");          // Espaços no início de linhas
  text = text.replace(/[ \t]+\n/g, "\n");          // Espaços no final de linhas
  text = text.replace(/\n{3,}/g, "\n\n");          // Max 2 quebras consecutivas

  return text.trim();
}
