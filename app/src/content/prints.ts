/**
 * 3D PRINTS PAGE. Edit the text and numbers here.
 * The Print Shop items and the "Prints I've made" gallery are added in the admin portal (Shop tab → Print Shop / Past prints).
 */

/** The three materials, explained for customers. `mult` scales the ballpark price (PLA = 1). */
export const materials = [
  {
    id: "PLA", name: "PLA", mult: 1, tag: "Most prints",
    blurb: "Stiff, crisp detail and the most colors. Great for stands, holders, keycaps and display pieces.",
    good: ["Sharpest detail", "Most colors", "Cheapest"],
    avoid: "Hot cars or anything near real heat. It softens around 140°F.",
  },
  {
    id: "PETG", name: "PETG", mult: 1.15, tag: "Inside your PC",
    blurb: "Tougher and more heat resistant. My pick for GPU brackets, fan grills and anything that lives inside a PC.",
    good: ["Handles PC heat", "Bends before it breaks", "Water resistant"],
    avoid: "Super fine detail. Edges come out a little softer than PLA.",
  },
  {
    id: "TPU", name: "TPU", mult: 1.4, tag: "Flexible",
    blurb: "Rubbery and bendy. Good for bumpers, feet, grips, cable straps and cases that need to take a hit.",
    good: ["Flexible and grippy", "Shock absorbing", "Hard to break"],
    avoid: "Anything that needs to stay stiff or hold weight.",
  },
] as const;
export type MaterialId = (typeof materials)[number]["id"];

/** Size choices on the custom request, with the ballpark price for one simple PLA print. */
export const sizes = [
  { id: "small", label: "Small", hint: "Fits in your palm · up to about 2 in", example: "keycap, cable clip", low: 4, high: 10 },
  { id: "medium", label: "Medium", hint: "Phone size · up to about 5 in", example: "cable combs, controller holder", low: 10, high: 22 },
  { id: "large", label: "Large", hint: "Up to about 9 in", example: "headphone stand, GPU bracket", low: 18, high: 40 },
  { id: "xl", label: "Extra large", hint: "Bigger, printed in pieces", example: "big display piece, case parts", low: 40, high: 100 },
] as const;
export type SizeId = (typeof sizes)[number]["id"];

export const details = [
  { id: "simple", label: "Simple", hint: "Plain shapes, flat sides", mult: 1 },
  { id: "detailed", label: "Detailed", hint: "Fine text, small parts, lots of supports", mult: 1.35 },
] as const;
export type DetailId = (typeof details)[number]["id"];

/** Does it need designing? Adds a design fee range on top. */
export const fileOptions = [
  { id: "file", label: "I have the file", hint: "STL or 3MF, e.g. from Printables or Thingiverse", low: 0, high: 0 },
  { id: "design", label: "I need it designed", hint: "Send a photo, sketch or measurements", low: 10, high: 35 },
] as const;
export type FileOptionId = (typeof fileOptions)[number]["id"];

/** Each extra copy costs this share of the first one. */
export const extraCopyShare = 0.8;

/** Colors shown as choices. I'll confirm what's in stock. */
export const colors = [
  { name: "Black", hex: "#16181d" },
  { name: "White", hex: "#f2f2ee" },
  { name: "Gray", hex: "#8a8f98" },
  { name: "Red", hex: "#d43b3b" },
  { name: "Blue", hex: "#2f6fe0" },
  { name: "Green", hex: "#2fbf71" },
  { name: "Orange", hex: "#f08a24" },
  { name: "Purple", hex: "#8b5cf6" },
];

/** Quick ideas on the request form. Tapping one fills in the description. */
export const ideas = [
  { label: "GPU support bracket", text: "A GPU support bracket to stop my graphics card sagging.", size: "large", material: "PETG" },
  { label: "Cable combs", text: "Cable combs for my PSU cables (24-pin, 8-pin CPU and GPU).", size: "medium", material: "PETG" },
  { label: "Headphone stand", text: "A headphone stand for my desk.", size: "large", material: "PLA" },
  { label: "Controller holder", text: "A holder for my controllers.", size: "medium", material: "PLA" },
  { label: "Fan grill", text: "A fan grill / cover for a 120mm fan.", size: "medium", material: "PETG" },
  { label: "Custom keycaps", text: "Custom keycaps for my keyboard.", size: "small", material: "PLA" },
  { label: "Name plate / logo", text: "A name plate or logo to show inside my PC.", size: "medium", material: "PLA" },
] as const;

/** Under "How it works" on the page. */
export const printSteps = [
  { icon: "chat", title: "Tell me what you want", text: "Describe it, add a photo or file, and see a ballpark price right away." },
  { icon: "tag", title: "Get the real price", text: "I check the file, size and print time, then text you a firm price. Usually within a day." },
  { icon: "box", title: "I print it, you pick it up", text: "Most prints are ready in 2 to 5 days. Pay when you pick it up." },
];

/** Picked in the build request ("Add a custom 3D print?"). */
export const buildAddOns = [
  { value: "No thanks" },
  { value: "GPU support bracket" },
  { value: "Name plate / logo for inside the case" },
  { value: "Cable combs" },
  { value: "Headphone stand" },
  { value: "Something else (tell me in the notes)" },
];

const up = (n: number) => Math.max(1, Math.round(n));

/** The ballpark range shown on the request form. */
export function printEstimate(size: SizeId, detail: DetailId, material: MaterialId, file: FileOptionId, qty: number): [number, number] {
  const s = sizes.find((x) => x.id === size)!;
  const m = details.find((x) => x.id === detail)!.mult * materials.find((x) => x.id === material)!.mult;
  const copies = 1 + extraCopyShare * Math.max(0, qty - 1);
  const f = fileOptions.find((x) => x.id === file)!;
  return [up(s.low * m * copies + f.low), up(s.high * m * copies + f.high)];
}
