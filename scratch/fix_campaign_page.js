import fs from 'fs';

const filePath = '/Users/brunopereira/Downloads/00 Projetos/Email Marketing/email-marketing-app/src/app/(dashboard)/campaigns/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\.eq\('campaignId', campaignId\);/g,
  ".eq('campaignId', campaignId).range(0, 9999);"
);

fs.writeFileSync(filePath, content);
console.log('Fixed campaign page.tsx');
