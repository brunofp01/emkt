/**
 * Webhook — Mailgun
 * Processa eventos do Mailgun com verificação HMAC-SHA256.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/lib/prisma";
import { inngest } from "@/shared/lib/inngest";
import type { EmailEventType } from "@prisma/client";

const MAILGUN_SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY!;

const eventMap: Record<string, EmailEventType> = {
  accepted: "SENT",
  delivered: "DELIVERED",
  opened: "OPENED",
  clicked: "CLICKED",
  "permanent_fail": "BOUNCED_HARD",
  "temporary_fail": "BOUNCED_SOFT",
  complained: "COMPLAINED",
  unsubscribed: "UNSUBSCRIBED",
};

function verifySignature(timestamp: string, token: string, signature: string): boolean {
  const encoded = crypto.createHmac("sha256", MAILGUN_SIGNING_KEY).update(timestamp + token).digest("hex");
  return encoded === signature;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const sig = payload.signature as { timestamp: string; token: string; signature: string };
    const eventData = payload["event-data"] as Record<string, unknown>;

    if (!sig || !verifySignature(sig.timestamp, sig.token, sig.signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const eventType = eventData.event as string;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const messageHeaders = (eventData.message as Record<string, unknown>)?.headers as Record<string, string> | undefined;
    const messageId = messageHeaders?.["message-id"] ?? (eventData.id as string) ?? "";
    const externalId = (eventData.id as string) ?? `mg_${Date.now()}`;
    const recipientEmail = (eventData.recipient as string) ?? "";
    const geoData = eventData.geolocation as Record<string, string> | undefined;

    const existing = await prisma.emailEvent.findUnique({ where: { externalId } });
    if (existing) return NextResponse.json({ duplicate: true }, { status: 200 });

    const contact = await prisma.contact.findUnique({ where: { email: recipientEmail } });
    if (!contact) return NextResponse.json({ skipped: true }, { status: 200 });

    await prisma.emailEvent.create({
      data: {
        externalId, contactId: contact.id, messageId, provider: "MAILGUN",
        eventType: mappedType,
        ip: (eventData.ip as string) ?? null,
        userAgent: (eventData["user-agent"] as string) ?? null,
        country: geoData?.country ?? null,
        city: geoData?.city ?? null,
        clickedUrl: (eventData.url as string) ?? null,
        bounceReason: ((eventData["delivery-status"] as Record<string, unknown>)?.description as string) ?? null,
        rawPayload: payload as any,
        timestamp: new Date(((eventData.timestamp as number) ?? Date.now() / 1000) * 1000),
      },
    });

    if (mappedType === "OPENED") await inngest.send({ name: "email/opened", data: { messageId } });
    if (mappedType === "BOUNCED_HARD") await prisma.contact.update({ where: { id: contact.id }, data: { status: "BOUNCED" } });
    if (mappedType === "COMPLAINED") await prisma.contact.update({ where: { id: contact.id }, data: { status: "COMPLAINED" } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Mailgun Error]", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
