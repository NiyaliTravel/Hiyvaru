import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import dv from "@/messages/dv.json";

// Every English string must have a Dhivehi counterpart and vice versa.
// A missing key renders a raw key path to the user — for a Dhivehi speaker in
// distress that's a broken screen, so this is treated as a real defect.
function flatten(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [prefix];
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("i18n completeness", () => {
  const enKeys = flatten(en).sort();
  const dvKeys = flatten(dv).sort();

  it("has no keys missing from Dhivehi", () => {
    expect(enKeys.filter((k) => !dvKeys.includes(k))).toEqual([]);
  });

  it("has no keys missing from English", () => {
    expect(dvKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("has no empty strings in either locale", () => {
    const empties: string[] = [];
    function walk(obj: unknown, path: string, locale: string) {
      if (typeof obj === "string") {
        if (obj.trim() === "") empties.push(`${locale}:${path}`);
      } else if (Array.isArray(obj)) {
        obj.forEach((v, i) => walk(v, `${path}[${i}]`, locale));
      } else if (obj && typeof obj === "object") {
        Object.entries(obj as Record<string, unknown>).forEach(([k, v]) =>
          walk(v, path ? `${path}.${k}` : k, locale),
        );
      }
    }
    walk(en, "", "en");
    walk(dv, "", "dv");
    expect(empties).toEqual([]);
  });
});
