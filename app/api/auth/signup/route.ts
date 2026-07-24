import { NextRequest, NextResponse } from "next/server";
import { completeSignup } from "@/lib/auth/signup";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await completeSignup(body);
  if (!result.ok) {
    const status =
      result.reason === "under_16"
        ? 403
        : result.reason === "already_registered"
          ? 409
          : 400;
    return NextResponse.json({ reason: result.reason }, { status });
  }
  await createSession(result.userId);
  return NextResponse.json({ ok: true, displayName: result.displayName });
}
