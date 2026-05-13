import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Email Providers (pelo menos um deve estar configurado)
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILRELAY_API_KEY: z.string().optional(),
  MAILRELAY_SUBDOMAIN: z.string().optional(),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
  MAILRELAY_API_KEY: process.env.MAILRELAY_API_KEY,
  MAILRELAY_SUBDOMAIN: process.env.MAILRELAY_SUBDOMAIN,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  // Não lançamos erro aqui para não derrubar a aplicação inteira em produção
}

export const env = parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>);

/**
 * Helper para verificar se temos algum provedor configurado.
 */
export const hasProviderConfigured = () => {
  return !!(
    env.RESEND_API_KEY || 
    env.BREVO_API_KEY || 
    env.MAILGUN_API_KEY || 
    env.MAILRELAY_API_KEY ||
    env.GMAIL_USER
  );
};
