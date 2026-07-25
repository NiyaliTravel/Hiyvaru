import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.subscription?.endpoint) {
    return NextResponse.json({ reason: "bad_subscription" }, { status: 400 });
  }
  await getDb().insert(schema.pushSubscriptions).values({
    userId: user.id,
    subscription: body.subscription,
  });
  return NextResponse.json({ ok: true });
}
