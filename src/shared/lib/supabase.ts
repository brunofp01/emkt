import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente Supabase Público (Browser/Anon).
 * Ideal para operações do lado do cliente ou onde o RLS deve agir.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

/**
 * Cliente Supabase Admin (Server-side Only).
 * Bypass total de RLS. Usado em Inngest Jobs e Background Tasks.
 * EXTREMAMENTE PODEROSO: Use apenas em arquivos .ts de servidor.
 */
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    })
  : supabase; // Fallback para anon se a chave não estiver configurada
