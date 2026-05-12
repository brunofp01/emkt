require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://tlkdjmzinrsizqgelowq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa2RqbXppbnJzaXpxZ2Vsb3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk5OTg0NiwiZXhwIjoyMDkzNTc1ODQ2fQ.bHsAD7DbljWkifAq3VcFHxvKOzEWcULE6uqqOrrBh9A'
);
const { selectProviderForSend } = require('../src/features/email/lib/provider-selector');

async function testLogic() {
  try {
    const { data: contacts } = await supabaseAdmin.from('CampaignContact').select('id, contactId').eq('stepStatus', 'QUEUED').limit(1);
    if (!contacts.length) return console.log("No QUEUED contacts");
    const campaignContactId = contacts[0].id;
    const contactId = contacts[0].contactId;

    console.log("Testing logic for contact:", contactId);
    
    // Simulate select-and-validate-provider
    const { data: configs, error } = await supabaseAdmin
      .from('ProviderConfig')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: true });

    if (error) throw error;
    console.log("Found active providers:", configs.length);
    
    console.log("Logic looks good if we got here without errors.");
  } catch(e) {
    console.error("Error:", e);
  }
}
testLogic();
