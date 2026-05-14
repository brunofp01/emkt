
"use server";

import { supabaseAdmin } from "@/shared/lib/supabase";
import { revalidatePath } from "next/cache";

/**
 * Inicializa as configurações de provedores no banco de dados.
 */
export async function setupDefaultProviders() {
  const providers = [
    {
      provider: 'RESEND',
      fromEmail: 'onboarding@resend.dev', // Default test email for Resend
      fromName: 'MailPulse Test',
      weight: 100,
      isActive: true,
    },
    {
      provider: 'BREVO',
      fromEmail: 'test@brevo.com',
      fromName: 'MailPulse Brevo',
      weight: 0,
      isActive: false,
    },
    {
      provider: 'MAILGUN',
      fromEmail: 'test@mailgun.com',
      fromName: 'MailPulse Mailgun',
      weight: 0,
      isActive: false,
    },
    {
      provider: 'MAILRELAY',
      fromEmail: 'brunofernandes@closerimobiliario.com.br',
      fromName: 'Bruno Fernandes',
      weight: 100,
      isActive: true,
    }
  ];

  try {
    for (const p of providers) {
      const { data: existing } = await supabaseAdmin
        .from('ProviderConfig')
        .select('id')
        .eq('provider', p.provider)
        .single();
        
      const payload = {
        ...p,
        id: existing?.id || crypto.randomUUID(),
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('ProviderConfig')
        .upsert(payload, { onConflict: 'provider' });
      
      if (error) console.error(`Erro ao configurar ${p.provider}:`, error.message);
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
