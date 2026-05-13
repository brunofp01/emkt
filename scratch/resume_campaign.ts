
import { createClient } from '@supabase/supabase-js';
import { Inngest } from 'inngest';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const inngest = new Inngest({ id: "email-marketing-platform", eventKey: process.env.INNGEST_EVENT_KEY });

async function run() {
  console.log("Fetching queued contacts...");
  const { data: contacts, error } = await supabase
    .from('CampaignContact')
    .select('id, contactId, currentStepId, campaignId, contact:Contact(email)')
    .eq('stepStatus', 'QUEUED')
    .limit(20);

  if (error) {
    console.error("Error fetching:", error);
    return;
  }

  if (!contacts || contacts.length === 0) {
    console.log("No queued contacts found.");
    return;
  }

  console.log(`Found ${contacts.length} contacts. Fetching step details...`);
  
  // Agrupar por campanha para buscar os steps
  const campaignIds = [...new Set(contacts.map(c => c.campaignId))];
  const { data: steps } = await supabase
    .from('CampaignStep')
    .select('*')
    .in('campaignId', campaignIds);

  const stepsByCampaign = (steps || []).reduce((acc: any, step: any) => {
    if (!acc[step.campaignId]) acc[step.campaignId] = [];
    acc[step.campaignId].push(step);
    return acc;
  }, {});

  const inngestEvents = contacts.map((cc) => {
    const campaignSteps = stepsByCampaign[cc.campaignId] || [];
    const step = campaignSteps.find((s: any) => s.id === cc.currentStepId) || campaignSteps[0];

    return {
      name: "email/send",
      data: {
        contactId: cc.contactId,
        campaignContactId: cc.id,
        subject: step?.subject || "No Subject",
        htmlBody: step?.htmlBody || "No Content",
        textBody: step?.textBody,
      },
    };
  });

  console.log(`Sending ${inngestEvents.length} events to Inngest...`);
  try {
    const res = await inngest.send(inngestEvents);
    console.log("Inngest response:", res);
  } catch (e) {
    console.error("Inngest Error:", e);
  }
}

run();
