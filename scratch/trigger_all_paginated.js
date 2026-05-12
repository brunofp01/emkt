require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Inngest } = require('inngest');

const supabase = createClient(
  'https://tlkdjmzinrsizqgelowq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa2RqbXppbnJzaXpxZ2Vsb3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk5OTg0NiwiZXhwIjoyMDkzNTc1ODQ2fQ.bHsAD7DbljWkifAq3VcFHxvKOzEWcULE6uqqOrrBh9A'
);
const inngest = new Inngest({ id: "email-marketing-platform", eventKey: process.env.INNGEST_EVENT_KEY });

async function fetchAllContacts(query, batchSize = 1000) {
  let allData = [];
  let from = 0;
  let to = batchSize - 1;
  let finished = false;
  while (!finished) {
    const { data, error } = await query.range(from, to);
    if (error) throw error;
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < batchSize) { finished = true; } 
      else { from += batchSize; to += batchSize; }
    } else { finished = true; }
  }
  return allData;
}

async function run() {
  try {
    const query = supabase.from('CampaignContact').select('id, contactId, currentStepId, campaignId, contact:Contact(email)').eq('stepStatus', 'QUEUED');
    const contacts = await fetchAllContacts(query);
    if (!contacts.length) return console.log("No queued contacts");

    console.log(`Found ${contacts.length} QUEUED contacts total!`);
    const campaignId = contacts[0].campaignId;
    const { data: steps } = await supabase.from('CampaignStep').select('*').eq('campaignId', campaignId).order('stepOrder', { ascending: true }).limit(1);
    const firstStep = steps[0];

    const BATCH_SIZE = 50;
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
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
      console.log(`Sending batch ${i} to ${i + batch.length}...`);
      await inngest.send(inngestEvents);
    }
    console.log("All missing contacts sent successfully!");
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
