import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { resendProvider } from '../features/email/providers/resend';
import { mailgunProvider } from '../features/email/providers/mailgun';
import { brevoProvider } from '../features/email/providers/brevo';
import { env } from '../shared/lib/env';

async function testProviders() {
  const toEmail = "privusimoveis@gmail.com";
  console.log("🚀 Iniciando Teste de Provedores...");
  console.log("Destinatário:", toEmail);

  // 1. RESEND
  try {
    if (env.RESEND_API_KEY) {
      console.log("\n--- [TESTE] RESEND ---");
      // Nota: Sem domínio verificado, o Resend só envia de onboarding@resend.dev
      const result = await resendProvider.send({
        to: toEmail,
        from: "onboarding@resend.dev", 
        fromName: "MailPulse (Resend Sandbox)",
        subject: "Teste Resend Sandbox",
        html: "<p>Se você recebeu isso, sua chave do Resend está OK!</p>",
      });
      console.log("Resultado Resend:", result);
    }
  } catch (err) { console.error("Erro no Resend:", err); }

  // 2. MAILGUN
  try {
    if (env.MAILGUN_API_KEY) {
      console.log("\n--- [TESTE] MAILGUN ---");
      // Nota: Usando o Sandbox Domain da imagem
      const result = await mailgunProvider.send({
        to: toEmail,
        from: `postmaster@${process.env.MAILGUN_DOMAIN}`,
        fromName: "MailPulse (Mailgun Sandbox)",
        subject: "Teste Mailgun Sandbox",
        html: "<p>Se você recebeu isso, sua chave do Mailgun está OK!</p>",
      });
      console.log("Resultado Mailgun:", result);
    }
  } catch (err) { console.error("Erro no Mailgun:", err); }

  // 3. BREVO
  try {
    if (env.BREVO_API_KEY) {
      console.log("\n--- [TESTE] BREVO ---");
      const result = await brevoProvider.send({
        to: toEmail,
        from: "newsletter@seuapp.com",
        fromName: "MailPulse (Brevo Test)",
        subject: "Teste Brevo Direto",
        html: "<p>Se você recebeu isso, sua chave do Brevo está OK!</p>",
      });
      console.log("Resultado Brevo:", result);
    }
  } catch (err) { console.error("Erro no Brevo:", err); }
}

testProviders().catch(console.error);
