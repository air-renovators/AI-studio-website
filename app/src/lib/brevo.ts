import { BrevoClient } from "@getbrevo/brevo";

function getClient(): BrevoClient {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY not set");
  return new BrevoClient({ apiKey });
}

export async function createCampaign(opts: {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  senderName: string;
  senderEmail: string;
  listIds: number[];
  scheduledAt?: string;
}): Promise<number> {
  const client = getClient();

  const response = await client.emailCampaigns.createEmailCampaign({
    name: opts.name,
    subject: opts.subject,
    previewText: opts.previewText,
    htmlContent: opts.htmlContent,
    sender: { name: opts.senderName, email: opts.senderEmail },
    recipients: { listIds: opts.listIds },
    ...(opts.scheduledAt ? { scheduledAt: opts.scheduledAt } : {}),
  });

  return response.id;
}

export async function sendCampaignNow(campaignId: number): Promise<void> {
  const client = getClient();
  await client.emailCampaigns.sendEmailCampaignNow({ campaignId });
}

export async function sendTestEmail(
  campaignId: number,
  testEmails: string[]
): Promise<void> {
  const client = getClient();
  await client.emailCampaigns.sendTestEmail({
    campaignId,
    body: { emailTo: testEmails },
  });
}

export async function sendTransactionalEmail(opts: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderName: string;
  senderEmail: string;
}): Promise<void> {
  const client = getClient();
  await client.transactionalEmails.sendTransacEmail({
    to: opts.to,
    subject: opts.subject,
    htmlContent: opts.htmlContent,
    textContent: opts.textContent,
    sender: { name: opts.senderName, email: opts.senderEmail },
  });
}

export async function uploadImageToGallery(imageUrl: string): Promise<string> {
  const client = getClient();
  const response = await client.emailCampaigns.uploadImageToGallery({
    imageUrl,
  });
  return response.url || "";
}
