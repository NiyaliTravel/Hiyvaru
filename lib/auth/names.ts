import { randomInt } from "crypto";

// Anonymous display-name generator, e.g. "BlueCoral42".
// Names are deliberately impersonal (sea/nature themed) — no human names,
// nothing that could collide with a real identity in a 500k-person society.

const ADJECTIVES = [
  "Blue", "Coral", "Silver", "Gentle", "Quiet", "Bright", "Calm", "Deep",
  "Golden", "Green", "Misty", "Ocean", "Pearl", "Sandy", "Soft", "Sunny",
  "Swift", "Teal", "Warm", "Wild", "Amber", "Azure", "Breezy", "Crystal",
  "Drift", "Early", "Free", "Island", "Lagoon", "Lunar", "Mellow", "North",
  "Salty", "Shining", "Starry", "Still", "Tidal", "Tranquil", "Velvet", "West",
] as const;

const NOUNS = [
  "Coral", "Manta", "Turtle", "Heron", "Dolphin", "Lagoon", "Reef", "Wave",
  "Palm", "Pearl", "Sandbar", "Seagrass", "Starfish", "Tuna", "Wren", "Breeze",
  "Cloud", "Cowrie", "Current", "Dhoni", "Fern", "Gull", "Horizon", "Island",
  "Jasmine", "Kite", "Lantern", "Lotus", "Moon", "Anchor", "Oyster", "Pebble",
  "Rain", "Shell", "Sponge", "Star", "Stone", "Tide", "Whale", "Wind",
] as const;

export function generateDisplayName(rng: (max: number) => number = randomInt): string {
  const adj = ADJECTIVES[rng(ADJECTIVES.length)];
  let noun = NOUNS[rng(NOUNS.length)];
  // Avoid "CoralCoral42"
  while (noun === adj) noun = NOUNS[rng(NOUNS.length)];
  const num = 10 + rng(90); // always two digits
  return `${adj}${noun}${num}`;
}

/** Try until we find a name not already taken (uniqueness enforced by DB index). */
export async function generateUniqueDisplayName(
  isTaken: (name: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const name = generateDisplayName();
    if (!(await isTaken(name))) return name;
  }
  // 40*39*90 combinations — collisions this deep mean something is wrong.
  throw new Error("could not generate a unique display name");
}
