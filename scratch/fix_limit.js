import fs from 'fs';

const filePath = '/Users/brunopereira/Downloads/00 Projetos/Email Marketing/email-marketing-app/src/features/campaigns/actions/create-campaign.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const \{ data: contactsToLink \} = await contactQuery;/g,
  'const { data: contactsToLink } = await contactQuery.range(0, 9999);'
);

fs.writeFileSync(filePath, content);
console.log('Fixed create-campaign.ts');
