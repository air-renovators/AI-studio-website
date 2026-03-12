import { runNewsletterPipeline } from "@/lib/newsletter-pipeline";
import type { NewsletterParams } from "@/lib/newsletter-types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const params: NewsletterParams = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runNewsletterPipeline(params, (progress) => {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));
        });
      } catch (err) {
        const errorData = `data: ${JSON.stringify({
          status: "error",
          phase: "done",
          currentStep: "Error",
          stepsCompleted: 0,
          stepsTotal: 0,
          errors: [err instanceof Error ? err.message : "Unknown error"],
          log: [],
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
