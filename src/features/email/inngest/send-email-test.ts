import { inngest } from "@/shared/lib/inngest";
import { supabaseAdmin } from "@/shared/lib/supabase";

export const sendEmailTest = inngest.createFunction(
  { 
    id: "send-email-test", 
    name: "TEST — Fast Send",
    triggers: [{ event: "email/test" }]
  },
  async ({ event, step }) => {
    const { campaignContactId } = event.data;
    
    await step.run("log-start", async () => {
      console.log(`[TEST] Starting for CC: ${campaignContactId}`);
      await supabaseAdmin.from('EmailEvent').insert({
        contactId: 'wkd4dez7sg05gy5s0xubcn', // dummy
        eventType: 'OPENED', // dummy to signal start
        messageId: `test-start-${campaignContactId}`,
        provider: 'MAILRELAY',
        ip: '0.0.0.0',
        timestamp: new Date().toISOString()
      });
    });

    await step.run("log-finish", async () => {
      console.log(`[TEST] Finished for CC: ${campaignContactId}`);
      await supabaseAdmin.from('CampaignContact').update({
        stepStatus: 'SENT',
        updatedAt: new Date().toISOString()
      }).eq('id', campaignContactId);
    });

    return { success: true };
  }
);
