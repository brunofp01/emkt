require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Inngest } = require('inngest');

const supabase = createClient(
  'https://tlkdjmzinrsizqgelowq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa2RqbXppbnJzaXpxZ2Vsb3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk5OTg0NiwiZXhwIjoyMDkzNTc1ODQ2fQ.bHsAD7DbljWkifAq3VcFHxvKOzEWcULE6uqqOrrBh9A'
);
const inngest = new Inngest({ id: "email-marketing-platform", eventKey: process.env.INNGEST_EVENT_KEY });

async function run() {
  try {
    const { data: contacts } = await supabase.from('CampaignContact').select('id, contactId, currentStepId, campaignId, contact:Contact(email)').eq('stepStatus', 'QUEUED').limit(5);
    if (!contacts.length) return console.log("No queued contacts");

    const campaignId = contacts[0].campaignId;
    const { data: steps } = await supabase.from('CampaignStep').select('*').eq('campaignId', campaignId).order('stepOrder', { ascending: true }).limit(1);
    const firstStep = steps[0];

    const batch = contacts;
    const inngestEvents = batch.map((cc) => ({
      name: "email/send",
      data: {
        contactId: cc.contactId,
        campaignContactId: cc.id,
        subject: firstStep.subject,
        htmlBody: firstStep.htmlBody,
        textBody: firstStep.textBody,
      },
    }));
    
    console.log("Sending to inngest...");
    const res = await inngest.send(inngestEvents);
    console.log("Inngest response:", res);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
