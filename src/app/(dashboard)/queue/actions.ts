"use server";

import { supabaseAdmin } from "@/shared/lib/supabase";
import { revalidatePath } from "next/cache";

/**
 * Server Action — Reenfileirar todos os emails com status FAILED.
 */
export async function retryFailedEmails() {
  await supabaseAdmin
    .from('CampaignContact')
    .update({ stepStatus: 'QUEUED', updatedAt: new Date().toISOString() })
    .in('stepStatus', ['FAILED']);

  revalidatePath("/queue");
}
