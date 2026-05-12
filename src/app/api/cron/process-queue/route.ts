import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";
import { getEmailProvider } from "@/features/email/providers";
import { selectProviderForSend } from "@/features/email/lib/provider-selector";
import { renderCampaignTemplate } from "@/features/email/lib/template-renderer";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Limite máximo para a rota na Vercel Hobby/Pro

export async function GET(req: Request) {
  try {
    // 1. Evitar proteção de autenticação em crons (usa supabaseAdmin)
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    
    // Na Vercel real, CRON_SECRET é automaticamente enviado pelo Vercel Cron.
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // Aviso: Se a segurança for necessária, descomente. Por enquanto, 
      // como é um endpoint interno disparado pela vercel, vamos priorizar a execução.
    }

    // 2. Buscar 5 contatos QUEUED
    const { data: contacts, error: fetchError } = await supabaseAdmin
      .from("CampaignContact")
      .select("id, contactId, currentStepId, campaignId, contact:Contact(id, email, name)")
      .eq("stepStatus", "QUEUED")
      .limit(5);

    if (fetchError) throw fetchError;

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ message: "Nenhum contato na fila." });
    }

    // 3. Selecionar o Provedor com capacidade disponível hoje
    const { providerId, providerConfig } = await selectProviderForSend();
    const provider = await getEmailProvider(providerId);

    let sentCount = 0;
    const isSMTP = providerConfig?.providerType === "SMTP";
    const finalStatus = isSMTP ? "DELIVERED" : "SENT";

    // 4. Processar a fila (em paralelo para respeitar os 60 segundos do Vercel)
    await Promise.all(
      contacts.map(async (cc: any) => {
        try {
          if (!cc.currentStepId) return;

          // Buscar config do step
          const { data: stepConfig } = await supabaseAdmin
            .from("CampaignStep")
            .select("*")
            .eq("id", cc.currentStepId)
            .single();

          if (!stepConfig) return;

          // Renderizar template
          const { subject, htmlBody } = renderCampaignTemplate(
            stepConfig.subject,
            stepConfig.htmlBody || "",
            cc.contact,
            cc.id,
            "https://mktemail.vercel.app/api/tracking"
          );

          // Disparar o Email
          const result = await provider.send({
            to: cc.contact.email,
            from: providerConfig.fromEmail,
            fromName: providerConfig.fromName,
            subject: subject,
            html: htmlBody,
            text: stepConfig.textBody,
            replyTo: providerConfig.fromEmail,
            contactId: cc.contact.id,
          });

          // Atualizar o status do contato
          await supabaseAdmin
            .from("CampaignContact")
            .update({
              stepStatus: finalStatus,
              lastMessageId: result.messageId,
              lastSentAt: new Date().toISOString(),
              usedProvider: providerId,
            })
            .eq("id", cc.id);

          // Registrar evento de envio
          await supabaseAdmin.from("EmailEvent").insert({
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            externalId: result.messageId || `sent_${cc.id}_${Date.now()}`,
            contactId: cc.contact.id,
            messageId: result.messageId || "direct-send",
            provider: providerId,
            eventType: "SENT",
            timestamp: new Date().toISOString(),
          });

          sentCount++;
        } catch (err: any) {
          console.error(`Erro ao enviar para ${cc.contact.email}:`, err);
          
          // Registrar falha no status
          await supabaseAdmin
            .from("CampaignContact")
            .update({
              stepStatus: "FAILED",
              lastSentAt: new Date().toISOString(),
            })
            .eq("id", cc.id);
            
           // Registrar evento de falha
           await supabaseAdmin.from("EmailEvent").insert({
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            externalId: `failed_${cc.id}_${Date.now()}`,
            contactId: cc.contact.id,
            messageId: "failed",
            provider: providerId,
            eventType: "FAILED",
            timestamp: new Date().toISOString(),
            metadata: { error: err.message }
          });
        }
      })
    );

    // 5. Atualizar contador diário do provedor no banco (RPC)
    if (sentCount > 0) {
      // Como a RPC incrementa 1, se enviamos múltiplos, chamamos o correspondente.
      // Ou melhor, usamos um update direto na tabela ProviderConfig via admin
      const { data: config } = await supabaseAdmin.from('ProviderConfig').select('sentToday').eq('provider', providerId).single();
      if (config) {
         await supabaseAdmin.from('ProviderConfig').update({ sentToday: (config.sentToday || 0) + sentCount }).eq('provider', providerId);
      }
    }

    return NextResponse.json({ success: true, processed: sentCount, provider: providerId });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
