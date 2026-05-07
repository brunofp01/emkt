import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase oficial (via HTTPS/REST).
 * Este cliente é extremamente estável em ambientes Serverless (Vercel)
 * pois não depende de protocolos de banco de dados diretos que podem sofrer
 * com restrições de IPv4/IPv6 ou pooling de conexões.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
