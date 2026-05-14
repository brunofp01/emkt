/**
 * Inngest Client — Configuração central para background jobs.
 * 
 * O Inngest substitui BullMQ/Redis para processamento assíncrono,
 * sendo nativamente compatível com Vercel (serverless).
 */
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "email-marketing-platform",
  name: "Email Marketing Platform",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
