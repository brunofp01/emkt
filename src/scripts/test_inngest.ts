import { Inngest } from "inngest";
import dotenv from "dotenv";
dotenv.config();

const inngest = new Inngest({
  id: "email-marketing-platform",
  name: "Email Marketing Platform",
});

async function run() {
  console.log("Sending event...");
  const result = await inngest.send({
    name: "email/send",
    data: {
      contactId: "test",
      campaignContactId: "test",
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
    },
  });
  console.log("Result:", result);
}
run().catch(console.error);
