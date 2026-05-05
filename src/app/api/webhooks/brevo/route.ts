/**
 * Webhook — Brevo
 * Processa eventos transacionais do Brevo. Verificação via custom header token.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { inngest } from "@/shared/lib/inngest";
import type { EmailEventType } from "@prisma/client";

const BREVO_WEBHOOK_TOKEN = process.env.BREVO_WEBHOOK_TOKEN!;

const eventMap: Record<string, EmailEventType> = {
  request: "SENT",
  delivered: "DELIVERED",
  opened: "OPENED",
  uniqueOpened: "OPENED",
  click: "CLICKED",
  hardBounce: "BOUNCED_HARD",
  softBounce: "BOUNCED_SOFT",
  spam: "COMPLAINED",
  invalid: "REJECTED",
  blocked: "REJECTED",
  unsubscribed: "UNSUBSCRIBED",
  deferred: "DELIVERY_DELAYED",
};

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-brevo-token") ?? req.headers.get("x-sib-token");
    if (token !== BREVO_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const eventType = payload.event as string;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const messageId = (payload["message-id"] as string) ?? "";
    const externalId = `brevo_${messageId}_${eventType}_${payload.ts ?? Date.now()}`;
    const recipientEmail = (payload.email as string) ?? "";

    const existing = await prisma.emailEvent.findUnique({ where: { externalId } });
    if (existing) return NextResponse.json({ duplicate: true }, { status: 200 });

    const contact = await prisma.contact.findUnique({ where: { email: recipientEmail } });
    if (!contact) return NextResponse.json({ skipped: true }, { status: 200 });

    await prisma.emailEvent.create({
      data: {
        externalId, contactId: contact.id, messageId, provider: "BREVO",
        eventType: mappedType,
        ip: (payload.ip as string) ?? null,
        clickedUrl: (payload.link as string) ?? null,
        bounceReason: (payload.reason as string) ?? null,
        rawPayload: payload as any,
        timestamp: new Date(((payload.ts as number) ?? Date.now() / 1000) * 1000),
      },
    });

    if (mappedType === "OPENED") await inngest.send({ name: "email/opened", data: { messageId } });
    if (mappedType === "BOUNCED_HARD") await prisma.contact.update({ where: { id: contact.id }, data: { status: "BOUNCED" } });
    if (mappedType === "COMPLAINED") await prisma.contact.update({ where: { id: contact.id }, data: { status: "COMPLAINED" } });
    if (mappedType === "UNSUBSCRIBED") await prisma.contact.update({ where: { id: contact.id }, data: { status: "UNSUBSCRIBED" } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Brevo Error]", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
