import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

// Accepts either a web-push subscription (PWA/browser) or a native device
// token (Capacitor iOS/Android). Both are stored in push_subscriptions; the
// `subscription` JSON records which kind it is.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  let subscription: unknown = null;
  if (body.subscription?.endpoint) {
    subscription = { kind: "webpush", ...body.subscription };
  } else if (typeof body.nativeToken === "string" && body.nativeToken.length > 0) {
    subscription = { kind: "native", token: body.nativeToken };
  }
  if (!subscription) {
    return NextResponse.json({ reason: "bad_subscription" }, { status: 400 });
  }

  await getDb().insert(schema.pushSubscriptions).values({ userId: user.id, subscription });
  return NextResponse.json({ ok: true });
}
