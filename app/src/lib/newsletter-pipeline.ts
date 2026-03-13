import { v4 as uuid } from "uuid";
import { promises as fs } from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { researchTopic } from "./research";
import type {
  NewsletterParams,
  NewsletterProgress,
  NewsletterContent,
  NewsletterSection,
  Newsletter,
} from "./newsletter-types";

// Always use /tmp — works on Vercel (read-only filesystem) and locally
const NEWSLETTERS_FILE = path.join("/tmp", "newsletters.json");
const BRAND_CONTEXT_PATH = path.join(
  process.cwd(),
  "..",
  "BRAND-CONTEXT.md"
);

async function loadBrandContext(): Promise<string> {
  try {
    return await fs.readFile(BRAND_CONTEXT_PATH, "utf-8");
  } catch {
    return "Brand: Kickass Kombucha. Tone: conversational, warm, health-focused. South African craft kombucha brand.";
  }
}

async function generateImage(prompt: string): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini image generation error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(
    (p: { inlineData?: { data: string } }) => p.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image returned from Gemini");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function generateNewsletterContent(
  topic: string,
  research: string,
  brandContext: string,
  additionalContext?: string
): Promise<NewsletterContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: `You are a newsletter writer for Kickass Kombucha, a craft kombucha brand in South Africa.
Write in a conversational, warm tone — like a friend who genuinely cares about the reader's health.

Brand voice for email: Conversational & Warm
- Write like a friend who genuinely cares
- Share tips, stories, brewing insights
- Invite people into the community

${brandContext}

You MUST respond with valid JSON only. No markdown, no code fences, just the JSON object.`,
    messages: [
      {
        role: "user",
        content: `Write a newsletter about: "${topic}"

${additionalContext ? `Additional context: ${additionalContext}` : ""}

Here is the research to base the content on:
---
${research}
---

Respond with a JSON object with this exact structure:
{
  "subjectLines": ["subject 1", "subject 2", "subject 3"],
  "preheader": "Preview text shown in inbox (50-90 chars)",
  "intro": "Opening paragraph that hooks the reader (2-3 sentences)",
  "sections": [
    {
      "heading": "Section heading",
      "body": "Section body text (2-4 paragraphs, use HTML tags like <p>, <strong>, <em>, <ul>, <li>)",
      "cta": { "text": "CTA button text", "url": "https://kickasskombucha.co.za" },
      "imagePrompt": "Detailed prompt for generating an infographic image for this section. Describe the style, colors, and content. Should be a clean, modern infographic style with the Kickass Kombucha brand colors (purple, green, warm tones)."
    }
  ],
  "outro": "Closing paragraph with a warm sign-off"
}

Create 3 sections. Each section should have a unique angle on the topic.
Make the image prompts descriptive — they will be used to generate infographic images with AI.`,
      },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock) throw new Error("No text response from Claude");

  // Strip markdown code fences if present
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(jsonText) as Omit<NewsletterContent, "research">;
  return { ...parsed, research };
}

function buildEmailHtml(content: NewsletterContent): string {
  const sectionHtml = content.sections
    .map(
      (section) => `
        <tr>
          <td style="padding: 0 0 32px 0;">
            ${
              section.imageUrl
                ? `<img src="${section.imageUrl}" alt="${section.heading}" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; margin-bottom: 16px;" />`
                : ""
            }
            <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #1a1a2e;">${section.heading}</h2>
            <div style="font-size: 16px; line-height: 1.6; color: #333;">${section.body}</div>
            ${
              section.cta
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 8px; padding: 12px 24px;">
                        <a href="${section.cta.url}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">${section.cta.text}</a>
                      </td>
                    </tr>
                  </table>`
                : ""
            }
          </td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kickass Kombucha Newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f1eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f1eb;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Kickass Kombucha</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">The Alchemist's Notebook</p>
            </td>
          </tr>
          <!-- Intro -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <p style="margin: 0; font-size: 17px; line-height: 1.6; color: #333;">${content.intro}</p>
            </td>
          </tr>
          <!-- Sections -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${sectionHtml}
              </table>
            </td>
          </tr>
          <!-- Outro -->
          <tr>
            <td style="padding: 16px 32px 32px 32px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #555;">${content.outro}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.5);">
                Kickass Kombucha &middot; Mtunzini, South Africa<br />
                <a href="https://kickasskombucha.co.za" style="color: rgba(255,255,255,0.7); text-decoration: underline;">kickasskombucha.co.za</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainText(content: NewsletterContent): string {
  const sections = content.sections
    .map(
      (s) =>
        `## ${s.heading}\n\n${s.body.replace(/<[^>]*>/g, "")}\n\n${
          s.cta ? `${s.cta.text}: ${s.cta.url}` : ""
        }`
    )
    .join("\n\n---\n\n");

  return `KICKASS KOMBUCHA — The Alchemist's Notebook\n\n${content.intro}\n\n---\n\n${sections}\n\n---\n\n${content.outro}\n\n---\nKickass Kombucha · Mtunzini, South Africa\nhttps://kickasskombucha.co.za`;
}

export async function readNewsletters(): Promise<Newsletter[]> {
  try {
    const raw = await fs.readFile(NEWSLETTERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveNewsletter(newsletter: Newsletter): Promise<void> {
  const existing = await readNewsletters();
  existing.unshift(newsletter);
  await fs.writeFile(NEWSLETTERS_FILE, JSON.stringify(existing, null, 2));
}

export async function runNewsletterPipeline(
  params: NewsletterParams,
  onProgress: (progress: NewsletterProgress) => void
): Promise<void> {
  const progress: NewsletterProgress = {
    status: "running",
    phase: "research",
    currentStep: "",
    stepsCompleted: 0,
    stepsTotal: 6,
    errors: [],
    log: [],
  };

  const emit = () => {
    onProgress({
      ...progress,
      log: [...progress.log],
      errors: [...progress.errors],
    });
  };

  const log = (msg: string) => {
    progress.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    emit();
  };

  try {
    // Step 1: Load brand context
    log("Pipeline v3 — no filesystem writes");
    log("Loading brand context...");
    const brandContext = await loadBrandContext();
    log("Brand context loaded");

    // Step 2: Research
    progress.phase = "research";
    progress.currentStep = "Researching topic with web search";
    emit();
    log(`Researching: "${params.topic}"`);

    const research = await researchTopic(params.topic, brandContext);
    progress.stepsCompleted = 1;
    log("Research complete");

    // Step 3: Content generation
    progress.phase = "content";
    progress.currentStep = "Generating newsletter content";
    emit();
    log("Generating newsletter content with Claude...");

    const content = await generateNewsletterContent(
      params.topic,
      research,
      brandContext,
      params.additionalContext
    );
    progress.stepsCompleted = 2;
    log(
      `Content generated: ${content.sections.length} sections, ${content.subjectLines.length} subject lines`
    );

    // Step 4: Image generation — always embed as base64 (no filesystem writes)
    progress.phase = "images";
    const numImages = params.numImages ?? content.sections.length;
    const sectionsToImage = content.sections.slice(0, numImages);
    progress.stepsTotal = 4 + sectionsToImage.length;
    emit();

    for (let i = 0; i < sectionsToImage.length; i++) {
      const section = sectionsToImage[i];
      progress.currentStep = `Generating image ${i + 1}/${sectionsToImage.length}`;
      emit();
      log(
        `Generating image ${i + 1}/${sectionsToImage.length}: ${section.heading}`
      );

      try {
        const imageBuffer = await generateImage(section.imagePrompt);
        const b64 = imageBuffer.toString("base64");
        section.imageUrl = `data:image/png;base64,${b64}`;
        log(`Image ${i + 1} generated`);
      } catch (err) {
        const msg = `Image ${i + 1} failed: ${err instanceof Error ? err.message : err}`;
        progress.errors.push(msg);
        log(`Error — ${msg}`);
      }
      progress.stepsCompleted = 3 + i;
      emit();
    }

    // Step 5: HTML rendering
    progress.phase = "html";
    progress.currentStep = "Building email HTML";
    emit();
    log("Building email HTML...");

    const html = buildEmailHtml(content);
    const plainText = buildPlainText(content);
    progress.stepsCompleted = progress.stepsTotal - 1;
    log("HTML and plain text generated");

    // Step 6: Save newsletter
    progress.currentStep = "Saving newsletter";
    emit();

    const newsletter: Newsletter = {
      id: uuid(),
      topic: params.topic,
      content,
      html,
      plainText,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    await saveNewsletter(newsletter);
    progress.stepsCompleted = progress.stepsTotal;
    progress.newsletter = newsletter;

    // Done
    progress.phase = "done";
    progress.status = "completed";
    progress.currentStep = "Complete";
    log(
      `Newsletter generated! ${content.sections.length} sections, ${progress.errors.length} errors`
    );
    emit();
  } catch (err) {
    progress.status = "error";
    const msg = `Pipeline error: ${err instanceof Error ? err.message : err}`;
    progress.errors.push(msg);
    log(msg);
    emit();
  }
}
