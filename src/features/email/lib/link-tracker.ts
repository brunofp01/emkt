/**
 * Link Tracker — Utilitário de reescrita de links para rastreamento.
 * 
 * Esta função identifica todos os links <a> no HTML e os substitui por
 * uma URL de proxy da própria MailPulse, permitindo rastreio preciso.
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

  // Injetar Pixel de Abertura (Tracking Pixel)
  const openTrackingPixel = `<img src="${baseUrl}/api/tracking/open?ccid=${campaignContactId}" width="1" height="1" style="display:none !important;" />`;
  $('body').append(openTrackingPixel);

  return $.html();
}
