const { Inngest } = require('inngest');
const inngest = new Inngest({ id: "email-marketing-platform" });
async function run() {
  try {
    const res = await inngest.send({
      name: "email/send",
      data: {
        contactId: "test",
        campaignContactId: "test",
        subject: "Test",
        htmlBody: "Test",
      }
    });
    console.log("Sent successfully:", res);
  } catch (err) {
    console.error("Error sending:", err);
  }
}
run();
