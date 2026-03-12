import { NextResponse } from "next/server";
import { readNewsletters } from "@/lib/newsletter-pipeline";

export async function GET() {
  const newsletters = await readNewsletters();
  return NextResponse.json(newsletters);
}
