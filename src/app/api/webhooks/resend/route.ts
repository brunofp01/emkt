/**
 * Webhook — Resend (Hardened & Unified)
 */
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";
import { env } from "@/shared/lib/env";
import type { EmailEventType } from "@prisma/client";

const RESEND_WEBHOOK_SECRET = env.RESEND_WEBHOOK_SECRET || "";

const eventMap: Record<string, EmailEventType> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELIVERY_DELAYED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED_HARD",
  "email.complained": "COMPLAINED",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers = {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    };

    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    const payload = wh.verify(body, headers) as Record<string, unknown>;

    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const externalId = headers["svix-id"];
    const messageId = (data.email_id as string) ?? "";
    const recipientEmail = Array.isArray(data.to) ? data.to[0] : (data.to as string);

    // 1. Idempotência e Busca de Contato (Admin Client)
    const { data: contact } = await supabaseAdmin
      .from('Contact')
      .select('id, tags')
      .eq('email', recipientEmail)
      .single();

    if (!contact) return NextResponse.json({ skipped: true, reason: "contact not found" }, { status: 200 });

    // 2. Persistência do Evento
    const { error: eventError } = await supabaseAdmin
      .from('EmailEvent')
      .insert({
        externalId,
        contactId: contact.id,
        messageId,
        provider: "RESEND",
        eventType: mappedType,
        ip: (data.ip as string) ?? null,
        userAgent: (data.user_agent as string) ?? null,
        clickedUrl: ((data.click as Record<string, unknown>)?.link as string) ?? null,
        bounceReason: ((data.bounce as Record<string, unknown>)?.message as string) ?? null,
        rawPayload: payload as any,
        timestamp: new Date((data.created_at as string) ?? Date.now()).toISOString(),
      });

    if (eventError && eventError.code !== '23505') throw eventError; // Ignora erro de duplicidade (PGRST116/23505)

    // 3. Lógica Unificada de Comportamento (Fase 4 & 6)
    const updates: Record<string, any> = {};
    
    // Se clicou via provedor, adicionar tag (Fase 6)
    if (mappedType === "CLICKED") {
      const currentTags = contact.tags || [];
      if (!currentTags.includes('CLICKED')) {
        updates.tags = [...currentTags, 'CLICKED'];
      }
    }

    // Se bounce ou reclamação, bloquear contato (Fase 4)
    if (mappedType === "BOUNCED_HARD") {
      updates.status = "BOUNCED";
    } else if (mappedType === "COMPLAINED") {
      updates.status = "COMPLAINED";
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('Contact').update(updates).eq('id', contact.id);
    }

    // 4. Trigger de Automação de Próxima Etapa
    if (mappedType === "OPENED" || mappedType === "CLICKED") {
      await inngest.send({ 
        name: mappedType === "OPENED" ? "email/opened" : "email/clicked", 
        data: { messageId, contactId: contact.id } 
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Resend Error]", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
