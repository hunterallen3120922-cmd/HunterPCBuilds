/**
 * TRADE-IN PRICE LIST (sketch). You keep these numbers up to date yourself, so there is no paid price API.
 * `value` = what you'd pay in cash for one that works fine, in dollars. Check recent eBay *sold* listings
 * every couple of weeks and adjust. The page does the rest of the math.
 */
export const tradeInUpdated = "Nov 2026";

/** Trade-in credit is worth this much more than cash (0.15 = 15% more). */
export const creditBonus = 0.15;

export const partTypes = [
  { id: "gpu", label: "Graphics card", icon: "monitor" },
  { id: "cpu", label: "Processor", icon: "chip" },
  { id: "ram", label: "Memory", icon: "save" },
  { id: "storage", label: "Storage", icon: "disc" },
  { id: "board", label: "Motherboard", icon: "code" },
  { id: "pc", label: "Whole PC", icon: "desktop" },
  { id: "laptop", label: "Laptop", icon: "laptop" },
] as const;

export type PartType = (typeof partTypes)[number]["id"];

export const priceList: { type: PartType; name: string; value: number }[] = [
  { type: "gpu", name: "RTX 4070", value: 360 },
  { type: "gpu", name: "RTX 3070", value: 220 },
  { type: "gpu", name: "RTX 3060 12GB", value: 170 },
  { type: "gpu", name: "RX 6700 XT", value: 180 },
  { type: "gpu", name: "RX 6600", value: 120 },
  { type: "gpu", name: "GTX 1660 Super", value: 85 },
  { type: "gpu", name: "GTX 1060 6GB", value: 45 },
  { type: "cpu", name: "Ryzen 7 5800X3D", value: 210 },
  { type: "cpu", name: "Ryzen 5 5600X", value: 75 },
  { type: "cpu", name: "Core i5-12400F", value: 70 },
  { type: "cpu", name: "Core i7-9700K", value: 85 },
  { type: "ram", name: "32GB DDR5 (2x16)", value: 65 },
  { type: "ram", name: "16GB DDR4 (2x8)", value: 22 },
  { type: "storage", name: "1TB NVMe SSD", value: 40 },
  { type: "storage", name: "2TB NVMe SSD", value: 75 },
  { type: "board", name: "B550 (AM4)", value: 60 },
  { type: "board", name: "B660 (Intel 12th/13th)", value: 65 },
  { type: "pc", name: "Gaming PC with RTX 3060 class", value: 450 },
  { type: "pc", name: "Older office PC", value: 60 },
  { type: "laptop", name: "Gaming laptop, 2021 or newer", value: 380 },
  { type: "laptop", name: "School laptop (i5/Ryzen 5)", value: 120 },
];

/** What each condition does to the price. `low`/`high` make the estimate a range. */
export const conditions = [
  { id: "new", label: "Like new", note: "Barely used, no marks", low: 0.95, high: 1.1 },
  { id: "good", label: "Works fine", note: "Normal wear, runs well", low: 0.85, high: 1.0 },
  { id: "issues", label: "Has issues", note: "Crashes, noisy fan, artifacts", low: 0.4, high: 0.6 },
  { id: "broken", label: "Broken", note: "Doesn't turn on, for parts", low: 0.1, high: 0.25 },
] as const;

export const extras = [
  { id: "box", label: "Original box", bonus: 0.05 },
  { id: "warranty", label: "Still under warranty", bonus: 0.08 },
];
