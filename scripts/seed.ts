// Dev/pilot seed: admin, duty moderator, one VERIFIED listener, one member.
// Run: npx tsx scripts/seed.ts   (uses the same DB the server uses)
// Login for any seeded account: request an OTP for its phone number and read
// the code from .data/outbox.jsonl (mock SMS mode).
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb, ensureMigrated, schema } from "../lib/db";
import { hashPhone } from "../lib/auth/crypto";

const SEED_USERS = [
  { role: "admin" as const, phone: "+9607000001", name: "AdminPearl01", lang: "both" as const },
  { role: "moderator" as const, phone: "+9607000002", name: "DutyHeron02", lang: "both" as const },
  { role: "listener" as const, phone: "+9607000010", name: "CalmLagoon10", lang: "both" as const },
  { role: "member" as const, phone: "+9607000020", name: "BlueCoral42", lang: "dv" as const },
];

async function main() {
  await ensureMigrated();
  const db = getDb();
  const { seedLexicons } = await import("../lib/safety/lexicons");
  await seedLexicons();
  for (const u of SEED_USERS) {
    const phoneHash = hashPhone(u.phone);
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.phoneHash, phoneHash))
      .limit(1);
    if (existing.length > 0) {
      console.log(`= ${u.name} already seeded`);
      continue;
    }
    const [row] = await db
      .insert(schema.users)
      .values({
        role: u.role,
        phoneHash,
        birthYear: 1990,
        displayName: u.name,
        lang: u.lang,
      })
      .returning({ id: schema.users.id });
    if (u.role === "listener") {
      // Seeded listener is fully verified + trained (dev shortcut; the real
      // pipeline is Phase C — production listeners MUST go through it).
      await db.insert(schema.listenerProfiles).values({
        userId: row.id,
        verifiedAt: new Date(),
        docType: "national_id",
        docExpiry: "2030-01-01",
        trainingCompletedAt: new Date(),
        level: "full",
        available: false,
      });
    }
    console.log(`+ seeded ${u.role} ${u.name} (${u.phone})`);
  }
  console.log("Done. OTP codes appear in .data/outbox.jsonl when logging in.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
