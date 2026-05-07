import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/shared/lib/supabase";
import { inngest } from "@/shared/lib/inngest";
import type { EmailEventType } from "@prisma/client";

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

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const eventType = payload.event;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const externalId = payload["message-id"] || `brevo-${Date.now()}`;
    const messageId = payload["message-id"];
    const recipientEmail = payload.email;

    const { data: existing } = await supabase.from('EmailEvent').select('id').eq('externalId', externalId).single();
    if (existing) return NextResponse.json({ duplicate: true }, { status: 200 });

    const { data: contact } = await supabase.from('Contact').select('id').eq('email', recipientEmail).single();
    if (!contact) return NextResponse.json({ skipped: true }, { status: 200 });

    const { error } = await supabase.from('EmailEvent').insert({
      externalId,
      contactId: contact.id,
      messageId,
      provider: "BREVO",
      eventType: mappedType,
      ip: payload.ip || null,
      rawPayload: payload,
      timestamp: new Date().toISOString(),
    });

    if (error) throw error;

    if (mappedType === "OPENED") await inngest.send({ name: "email/opened", data: { messageId } });
    if (mappedType === "BOUNCED_HARD") await supabase.from('Contact').update({ status: "BOUNCED" }).eq('id', contact.id);
    if (mappedType === "COMPLAINED") await supabase.from('Contact').update({ status: "COMPLAINED" }).eq('id', contact.id);
    if (mappedType === "UNSUBSCRIBED") await supabase.from('Contact').update({ status: "UNSUBSCRIBED" }).eq('id', contact.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Brevo Error]", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
