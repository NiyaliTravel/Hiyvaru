import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { submitApplication } from "@/lib/listener/application";

// Listener application: requires a logged-in account (any member can apply).
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  if (user.role !== "member") {
    return NextResponse.json({ reason: "already_listener" }, { status: 409 });
  }
  const { rateLimit } = await import("@/lib/ratelimit");
  if (!rateLimit(`apply:${user.id}`, 3, 24 * 3600_000)) {
    return NextResponse.json({ reason: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await submitApplication({
    userId: user.id,
    docType: body.docType === "passport" ? "passport" : "national_id",
    docExpiry: String(body.docExpiry ?? ""),
    idImageBase64: String(body.idImageBase64 ?? ""),
    idImageMime: String(body.idImageMime ?? ""),
    selfieBase64: String(body.selfieBase64 ?? ""),
    selfieMime: String(body.selfieMime ?? ""),
    bio: typeof body.bio === "string" ? body.bio : undefined,
  });
  if (!result.ok) return NextResponse.json({ reason: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true });
}
