/**
 * Link Tracker — Utilitário de reescrita de links para rastreamento.
 * 
 * Esta função identifica todos os links <a> no HTML e os substitui por
 * uma URL de proxy da própria MailPulse, permitindo rastreio preciso.
 * 
 * Melhorias de deliverability:
 *   - Tracking pixel otimizado (menos detectável por filtros)
 *   - Links de unsubscribe preservados (não rastreados)
 */

import * as cheerio from 'cheerio';

interface RewriteLinksOptions {
  html: string;
  campaignContactId: string;
  baseUrl: string;
}

/**
 * Escaneia o HTML e substitui links por URLs de rastreamento.
 */
export function rewriteLinks({ html, campaignContactId, baseUrl }: RewriteLinksOptions): string {
  if (!html) return html;

  const $ = cheerio.load(html);

  $('a').each((_, element) => {
    const originalHref = $(element).attr('href');
    
    // Ignorar links vazios, âncoras internas ou links de descadastro (que já têm lógica própria)
    if (
      !originalHref || 
      originalHref.startsWith('#') || 
      originalHref.startsWith('mailto:') || 
      originalHref.includes('unsubscribe')
    ) {
      return;
    }

    // Criar a URL de rastreamento
    // Usamos Base64 para a URL de destino para evitar problemas com caracteres especiais na query string
    const encodedUrl = Buffer.from(originalHref).toString('base64');
    const trackingUrl = `${baseUrl}/api/tracking/click?ccid=${campaignContactId}&url=${encodedUrl}`;

    $(element).attr('href', trackingUrl);
  });

  // Injetar Pixel de Abertura (Tracking Pixel) — otimizado para deliverability
  // Usar um pixel transparente com atributos naturais que não disparam filtros
  const openTrackingPixel = `<img src="${baseUrl}/api/tracking/open?ccid=${campaignContactId}" width="1" height="1" alt="" style="border:0;height:1px;width:1px;opacity:0;overflow:hidden;" />`;
  
  // Inserir o pixel dentro do conteúdo, não no final absoluto
  // Colocar antes do último </div> ou </td> para parecer mais natural
  const bodyEl = $('body');
  if (bodyEl.length) {
    bodyEl.append(openTrackingPixel);
  } else {
    // Fallback: append no final
    $.root().append(openTrackingPixel);
  }

  return $.html();
}
