import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/shared/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { providerId, isActive } = await req.json();

    const { error } = await supabaseAdmin
      .from('ProviderConfig')
      .update({ isActive, updatedAt: new Date().toISOString() })
      .eq('id', providerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Settings Error]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
