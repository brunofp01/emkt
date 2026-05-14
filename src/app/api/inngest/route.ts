/**
 * Inngest serve route — Expõe as functions do Inngest para o runtime.
 * Este é o endpoint que o Inngest Cloud chama para executar as functions.
 */
import { serve } from "inngest/next";
import { inngest } from "@/shared/lib/inngest";
import { sendEmail } from "@/features/email/inngest/send-email";
import { processSequence } from "@/features/email/inngest/process-sequence";
import { sendEmailTest } from "@/features/email/inngest/send-email-test";
import { cronProcessQueue } from "@/features/email/inngest/cron-process-queue";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendEmail, processSequence, sendEmailTest, cronProcessQueue],
});
