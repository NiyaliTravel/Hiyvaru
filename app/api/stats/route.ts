import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/stats";

// PUBLIC platform stats (founder request 2026-07-25): counts only, nothing
// identifying. Shown on the landing page; admin dashboard uses it too.
export async function GET() {
  return NextResponse.json(await getPublicStats());
}
