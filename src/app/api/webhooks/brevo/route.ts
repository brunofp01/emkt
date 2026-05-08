/**
 * Webhook Brevo (ex-Sendinblue) — Hardened
 * Recebe eventos de email (delivered, opened, clicked, bounced, etc.)
 * e atualiza tanto EmailEvent quanto CampaignContact.stepStatus.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";
import { recordSendResult } from "@/features/email/lib/warmup-engine";
import type { EmailEventType } from "@prisma/client";

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const eventMap: Record<string, EmailEventType> = {
  "request": "SENT",
  "delivered": "DELIVERED",
  "opened": "OPENED",
  "click": "CLICKED",
  "soft_bounce": "BOUNCED_SOFT",
  "hard_bounce": "BOUNCED_HARD",
  "complaint": "COMPLAINED",
  "unsubscribed": "UNSUBSCRIBED",
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
    const eventType = payload.event;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const externalId = payload["message-id"] || `brevo-${Date.now()}`;
    const messageId = payload["message-id"];
    const recipientEmail = payload.email;

    // Deduplicação
    const { data: existing } = await supabaseAdmin.from('EmailEvent').select('id').eq('externalId', externalId).maybeSingle();
    if (existing) return NextResponse.json({ duplicate: true }, { status: 200 });

    // Buscar contato
    const { data: contact } = await supabaseAdmin.from('Contact').select('id, provider').eq('email', recipientEmail).single();
    if (!contact) return NextResponse.json({ skipped: true }, { status: 200 });

    const now = new Date().toISOString();

    // 1. Registrar evento
    const { error } = await supabaseAdmin.from('EmailEvent').insert({
      id: generateId(),
      externalId,
      contactId: contact.id,
      messageId,
      provider: "BREVO",
      eventType: mappedType,
      ip: payload.ip || null,
      rawPayload: payload,
      timestamp: now,
    });

    if (error) throw error;

    // 2. Atualizar stepStatus do CampaignContact (se aplicável)
    const newStepStatus = stepStatusMap[mappedType];
    if (newStepStatus) {
      // Buscar CampaignContact vinculado a esse messageId ou contato
      const { data: campaignContacts } = await supabaseAdmin
        .from('CampaignContact')
        .select('id, stepStatus, lastMessageId')
        .eq('contactId', contact.id)
        .order('updatedAt', { ascending: false })
        .limit(5);

      if (campaignContacts) {
        for (const cc of campaignContacts) {
          // Verificar se é o mesmo message ou o mais recente
          const isMatch = cc.lastMessageId === messageId || (campaignContacts.length === 1);
          if (!isMatch) continue;

          // Só promover na hierarquia (nunca retroceder)
          const currentRank = statusRank[cc.stepStatus] ?? 0;
          const newRank = statusRank[newStepStatus] ?? 0;

          if (newRank > currentRank || newRank < 0) {
            const updateData: any = { stepStatus: newStepStatus, updatedAt: now };
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Brevo Error]", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
