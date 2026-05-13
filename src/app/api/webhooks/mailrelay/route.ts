/**
 * Webhook Mailrelay — Event Subscriptions
 * Recebe eventos de email (delivered, opened, clicked, bounced, etc.)
 * e atualiza tanto EmailEvent quanto CampaignContact.stepStatus.
 * 
 * Para configurar no painel Mailrelay:
 *   1. Acesse Settings > Event Subscriptions (ou API > Webhooks)
 *   2. Adicione a URL: https://mktemail.vercel.app/api/webhooks/mailrelay
 *   3. Selecione os eventos: delivered, opened, clicked, hard_bounce, soft_bounce, complaint, unsubscribed
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";
import { recordSendResult } from "@/features/email/lib/warmup-engine";
import type { EmailEventType } from "@prisma/client";

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

/**
 * Mapeamento de eventos do Mailrelay para o enum EmailEventType do sistema.
 * Os nomes de evento podem variar — esse mapeamento cobre os padrões conhecidos.
 */
const eventMap: Record<string, EmailEventType> = {
  // Nomes no estilo padrão Mailrelay
  "delivered": "DELIVERED",
  "delivery": "DELIVERED",
  "open": "OPENED",
  "opened": "OPENED",
  "click": "CLICKED",
  "clicked": "CLICKED",
  "soft_bounce": "BOUNCED_SOFT",
  "hard_bounce": "BOUNCED_HARD",
  "bounce": "BOUNCED_HARD",
  "complaint": "COMPLAINED",
  "spam": "COMPLAINED",
  "unsubscribe": "UNSUBSCRIBED",
  "unsubscribed": "UNSUBSCRIBED",
  "rejected": "REJECTED",
  "deferred": "DELIVERY_DELAYED",
};

/** Mapeamento de evento para stepStatus do CampaignContact */
const stepStatusMap: Record<string, string> = {
  "SENT": "SENT",
  "DELIVERED": "DELIVERED",
  "OPENED": "OPENED",
  "CLICKED": "CLICKED",
  "BOUNCED_SOFT": "BOUNCED",
  "BOUNCED_HARD": "BOUNCED",
};

/** Hierarquia para só promover, nunca retroceder */
const statusRank: Record<string, number> = {
  'PENDING': 0, 'QUEUED': 1, 'SENDING': 2, 'SENT': 3,
  'DELIVERED': 4, 'OPENED': 5, 'CLICKED': 6,
  'BOUNCED': -1, 'FAILED': -1,
};

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // O Mailrelay pode enviar arrays ou objetos individuais
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      await processEvent(event);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Mailrelay Error]", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

async function processEvent(payload: Record<string, unknown>) {
  // Extrair tipo de evento — Mailrelay pode usar "event", "event_type", ou "type"
  const rawEventType = (
    payload.event || payload.event_type || payload.type || ""
  ) as string;
  
  const mappedType = eventMap[rawEventType.toLowerCase()];
  if (!mappedType) {
    console.log(`[Webhook Mailrelay] Evento ignorado: ${rawEventType}`);
    return;
  }

  // Extrair identificadores — Mailrelay pode usar diferentes chaves
  const messageId = (
    payload.message_id || payload["message-id"] || payload.msg_id || ""
  ) as string;
  
  const recipientEmail = (
    payload.email || payload.recipient || payload.to || ""
  ) as string;
  
  const externalId = messageId 
    ? `mailrelay-${messageId}-${rawEventType}` 
    : `mailrelay-${Date.now()}-${rawEventType}`;

  if (!recipientEmail) {
    console.warn("[Webhook Mailrelay] Evento sem email do destinatário:", payload);
    return;
  }

  // Deduplicação
  const { data: existing } = await supabaseAdmin
    .from('EmailEvent')
    .select('id')
    .eq('externalId', externalId)
    .maybeSingle();
  if (existing) return;

  // Buscar contato
  const { data: contact } = await supabaseAdmin
    .from('Contact')
    .select('id, provider')
    .eq('email', recipientEmail)
    .single();
  if (!contact) return;

  const now = new Date().toISOString();

  // 1. Registrar evento
  const { error } = await supabaseAdmin.from('EmailEvent').insert({
    id: generateId(),
    externalId,
    contactId: contact.id,
    messageId: messageId || 'mailrelay-webhook',
    provider: "MAILRELAY",
    eventType: mappedType,
    ip: (payload.ip as string) || null,
    userAgent: (payload.user_agent as string) || null,
    clickedUrl: (payload.url as string) || (payload.link as string) || null,
    rawPayload: payload,
    timestamp: now,
  });

  if (error) {
    console.error("[Webhook Mailrelay] Erro ao inserir EmailEvent:", error);
    return;
  }

  // 2. Atualizar stepStatus do CampaignContact (se aplicável)
  const newStepStatus = stepStatusMap[mappedType];
  if (newStepStatus) {
    const { data: campaignContacts } = await supabaseAdmin
      .from('CampaignContact')
      .select('id, stepStatus, lastMessageId')
      .eq('contactId', contact.id)
      .order('updatedAt', { ascending: false })
      .limit(5);

    if (campaignContacts) {
      for (const cc of campaignContacts) {
        const isMatch = cc.lastMessageId === messageId || (campaignContacts.length === 1);
        if (!isMatch) continue;

        const currentRank = statusRank[cc.stepStatus] ?? 0;
        const newRank = statusRank[newStepStatus] ?? 0;

        if (newRank > currentRank || newRank < 0) {
          const updateData: Record<string, unknown> = { stepStatus: newStepStatus, updatedAt: now };
          if (newStepStatus === 'OPENED') updateData.lastOpenedAt = now;

          await supabaseAdmin
            .from('CampaignContact')
            .update(updateData)
            .eq('id', cc.id);
        }
      }
    }
  }

  // 3. Ações específicas por tipo de evento
  if (mappedType === "OPENED") {
    await inngest.send({ name: "email/opened", data: { messageId, contactId: contact.id } });
  }
  
  if (mappedType === "BOUNCED_HARD") {
    await supabaseAdmin.from('Contact').update({ status: "BOUNCED", updatedAt: now }).eq('id', contact.id);
    await recordSendResult(contact.provider, "bounced");
  }
  
  if (mappedType === "COMPLAINED") {
    await supabaseAdmin.from('Contact').update({ status: "COMPLAINED", updatedAt: now }).eq('id', contact.id);
    await recordSendResult(contact.provider, "complained");
  }
  
  if (mappedType === "UNSUBSCRIBED") {
    await supabaseAdmin.from('Contact').update({ status: "UNSUBSCRIBED", updatedAt: now }).eq('id', contact.id);
  }
}
