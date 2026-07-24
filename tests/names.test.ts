import { describe, expect, it } from "vitest";
import { generateDisplayName, generateUniqueDisplayName } from "@/lib/auth/names";

describe("anonymous display names", () => {
  it("generates AdjectiveNounNN shape", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateDisplayName()).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
    }
  });

  it("retries until unique", async () => {
    const seen = new Set<string>();
    let calls = 0;
    const name = await generateUniqueDisplayName(async (n) => {
      calls++;
      if (calls <= 3) {
        seen.add(n);
        return true; // pretend the first three are taken
      }
      return seen.has(n);
    });
    expect(name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
    expect(seen.has(name)).toBe(false);
  });
});
