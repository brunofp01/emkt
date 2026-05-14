import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasApiKey: !!process.env.MAILRELAY_API_KEY,
    apiKeyPrefix: process.env.MAILRELAY_API_KEY?.substring(0, 4),
    subdomain: process.env.MAILRELAY_SUBDOMAIN,
  });
}
