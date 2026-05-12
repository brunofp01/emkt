import { NextResponse } from "next/server";
import { inngest } from "@/shared/lib/inngest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await inngest.send({
      name: "email/send",
      data: {
        contactId: "test",
        campaignContactId: "test",
        subject: "Test",
        htmlBody: "Test",
        textBody: "Test",
      }
    });
    return NextResponse.json({ success: true, response: res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}
