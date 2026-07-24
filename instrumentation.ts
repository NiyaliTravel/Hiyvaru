// Runs once when the Next.js server boots (nodejs runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureMigrated } = await import("@/lib/db");
    await ensureMigrated();
  }
}
