/**
 * Webhook — Resend
 * 
 * Processa eventos do Resend usando verificação Svix.
 * Eventos: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/shared/lib/prisma";
import { inngest } from "@/shared/lib/inngest";
import type { EmailEventType } from "@prisma/client";

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!;

/** Mapeia eventos Resend para nosso enum interno */
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

    // Verificar assinatura Svix
    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    const payload = wh.verify(body, headers) as Record<string, unknown>;

    const eventType = payload.type as string;
    const data = payload.data as Record<string, unknown>;
    const mappedType = eventMap[eventType];
    if (!mappedType) return NextResponse.json({ skipped: true }, { status: 200 });

    const externalId = headers["svix-id"];
    const messageId = (data.email_id as string) ?? "";
    const recipientEmail = Array.isArray(data.to) ? data.to[0] : (data.to as string);

    // Idempotência: verificar se já processamos este evento
    const existing = await prisma.emailEvent.findUnique({ where: { externalId } });
    if (existing) return NextResponse.json({ duplicate: true }, { status: 200 });

    // Buscar contato pelo email
    const contact = await prisma.contact.findUnique({ where: { email: recipientEmail } });
    if (!contact) return NextResponse.json({ skipped: true, reason: "contact not found" }, { status: 200 });

    // Salvar evento
    await prisma.emailEvent.create({
      data: {
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
        timestamp: new Date((data.created_at as string) ?? Date.now()),
      },
    });

    // Se foi abertura, disparar processamento da régua
    if (mappedType === "OPENED") {
      await inngest.send({ name: "email/opened", data: { messageId } });
    }

    // Atualizar status do contato em caso de bounce/spam
    if (mappedType === "BOUNCED_HARD") {
      await prisma.contact.update({ where: { id: contact.id }, data: { status: "BOUNCED" } });
    } else if (mappedType === "COMPLAINED") {
      await prisma.contact.update({ where: { id: contact.id }, data: { status: "COMPLAINED" } });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[Webhook Resend Error]", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
