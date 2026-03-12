import { NextResponse } from "next/server";
import {
  createCampaign,
  sendCampaignNow,
  sendTestEmail,
  sendTransactionalEmail,
} from "@/lib/brevo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, newsletter, testEmail, listIds, senderName, senderEmail, scheduledAt } = body;

    const sender = senderName || "Kickass Kombucha";
    const email = senderEmail || "newsletter@kickasskombucha.co.za";

    if (action === "test") {
      await sendTransactionalEmail({
        to: [{ email: testEmail }],
        subject: `[TEST] ${newsletter.content.subjectLines[0]}`,
        htmlContent: newsletter.html,
        textContent: newsletter.plainText,
        senderName: sender,
        senderEmail: email,
      });
      return NextResponse.json({ success: true, message: "Test email sent" });
    }

    if (action === "draft" || action === "send" || action === "schedule") {
      const campaignId = await createCampaign({
        name: `Newsletter: ${newsletter.topic} — ${new Date().toLocaleDateString()}`,
        subject: newsletter.content.subjectLines[0],
        previewText: newsletter.content.preheader,
        htmlContent: newsletter.html,
        senderName: sender,
        senderEmail: email,
        listIds: listIds || [],
        ...(action === "schedule" && scheduledAt ? { scheduledAt } : {}),
      });

      if (action === "send") {
        await sendCampaignNow(campaignId);
        return NextResponse.json({
          success: true,
          campaignId,
          message: "Campaign sent",
        });
      }

      if (action === "test" && testEmail) {
        await sendTestEmail(campaignId, [testEmail]);
      }

      return NextResponse.json({
        success: true,
        campaignId,
        message:
          action === "schedule"
            ? "Campaign scheduled"
            : "Campaign saved as draft",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
