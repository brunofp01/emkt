/**
 * Helper para importar supabaseAdmin em Server Actions.
 * Necessário porque Server Actions inline não podem importar diretamente
 * módulos com efeitos colaterais no escopo do módulo pai.
 */
import { supabaseAdmin } from "@/shared/lib/supabase";

export function importSupabaseAdmin() {
  return supabaseAdmin;
}
