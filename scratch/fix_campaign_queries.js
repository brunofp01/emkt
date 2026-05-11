import fs from 'fs';

const filePath = '/Users/brunopereira/Downloads/00 Projetos/Email Marketing/email-marketing-app/src/features/campaigns/lib/queries.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix getCampaignById subquery limit (PostgREST syntax)
content = content.replace(
  /campaignContacts:CampaignContact\(/g,
  'campaignContacts:CampaignContact(limit=10000,'
);

// Fix getCampaignAnalytics
content = content.replace(
  /\.eq\('campaignId', campaignId\);/g,
  ".eq('campaignId', campaignId).range(0, 9999);"
);

content = content.replace(
  /\.in\('contactId', contactIds\);/g,
  ".in('contactId', contactIds).range(0, 9999);"
);

fs.writeFileSync(filePath, content);
console.log('Fixed campaign queries.ts');
