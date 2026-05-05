/**
 * Webhook — useSend (ex-Unsend)
 * Processa eventos do useSend. Verificação via Bearer token.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { inngest } from "@/shared/lib/inngest";
import type { EmailEventType } from "@prisma/client";

const USESEND_WEBHOOK_SECRET = process.env.USESEND_WEBHOOK_SECRET!;

const eventMap: Record<string, EmailEventType> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED_HARD",
  "email.complained": "COMPLAINED",
};

export async function POST(req: NextRequest) {
  try {
    // Verificar token
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${USESEND_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as Record<string, unknown>;
    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const externalId = (payload.id as string) ?? `usesend_${Date.now()}`;
    const messageId = (data.emailId as string) ?? "";
    const recipientEmail = (data.to as string) ?? "";

    const existing = await prisma.emailEvent.findUnique({ where: { externalId } });
    if (existing) return NextResponse.json({ duplicate: true }, { status: 200 });

    const contact = await prisma.contact.findUnique({ where: { email: recipientEmail } });
    if (!contact) return NextResponse.json({ skipped: true }, { status: 200 });

    await prisma.emailEvent.create({
      data: {
        externalId, contactId: contact.id, messageId, provider: "USESEND",
        eventType: mappedType,
        ip: (data.ip as string) ?? null,
        userAgent: (data.userAgent as string) ?? null,
        clickedUrl: (data.url as string) ?? null,
        rawPayload: payload as any,
        timestamp: new Date((data.timestamp as string) ?? Date.now()),
      },
    });

    if (mappedType === "OPENED") await inngest.send({ name: "email/opened", data: { messageId } });
    if (mappedType === "BOUNCED_HARD") await prisma.contact.update({ where: { id: contact.id }, data: { status: "BOUNCED" } });
    if (mappedType === "COMPLAINED") await prisma.contact.update({ where: { id: contact.id }, data: { status: "COMPLAINED" } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook useSend Error]", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
