import Anthropic from "@anthropic-ai/sdk";

export async function researchTopic(
  topic: string,
  brandContext: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: `You are a research assistant for Kickass Kombucha, a craft kombucha brand in South Africa.
Your job is to research a given topic and produce a structured research brief that will be used to write a newsletter.

Use the web search tool to find the latest facts, statistics, trends, and expert opinions on the topic.
Focus on information that is relevant to a health-conscious audience interested in kombucha, gut health, and wellness.

Here is the brand context to guide your research angle:
---
${brandContext}
---

Output a structured research brief with:
1. **Key Facts & Statistics** — 5-8 factual data points with sources
2. **Latest Trends** — What's new or trending in this space
3. **Expert Insights** — Quotes or findings from credible sources
4. **Brand Connection** — How this topic connects to Kickass Kombucha's mission and products
5. **Newsletter Angles** — 2-3 suggested angles for the newsletter content`,
    messages: [
      {
        role: "user",
        content: `Research the following topic for our next newsletter: "${topic}"

Find current, relevant information that our audience of health-conscious South Africans would find valuable. Include specific data points, recent studies, and expert opinions.`,
      },
    ],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ],
  });

  // Extract text content from the response (skip tool use/result blocks)
  const textParts = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text);

  return textParts.join("\n\n");
}
