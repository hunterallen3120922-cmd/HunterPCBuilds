import type { Option } from "../types";

/**
 * CHOICES SHOWN IN THE REQUEST FORMS.
 * Add or remove lines to change what customers can pick.
 * (If you leave out `label`, the `value` is shown.)
 */
export const deviceTypes: Option[] = [
  { value: "Windows laptop", icon: "laptop", description: "HP, Dell, Lenovo, ASUS…" },
  { value: "MacBook", icon: "laptop", description: "Software issues mostly" },
  { value: "Desktop PC", icon: "desktop", description: "Tower or all-in-one" },
  { value: "Gaming console", icon: "gamepad", description: "Cleaning & basic repair" },
  { value: "Phone / tablet", icon: "phone", description: "Ask first, limited" },
  { value: "Other", icon: "help", description: "Tell me about it" },
];

/*
 * PC BUILD REQUEST: each question installs a part in the PC drawing beside the form (components/build/Workbench.tsx).
 * Keep the order of each list (the drawing goes by position: first = smallest/cheapest). Wording is free to change.
 * `art` is the little drawing on the card (names in components/build/PartArt.tsx).
 */
export const caseSizes: Option[] = [
  { value: "ITX (mini)", label: "ITX", description: "Mini. Fits a small desk or dorm", art: "case-itx", quip: "Small but mighty. Respect." },
  { value: "Micro-ATX", description: "Compact tower, great value", art: "case-matx", quip: "The sweet spot. Smart pick." },
  { value: "ATX (full size)", label: "ATX", description: "Full size, most room + airflow", art: "case-atx", quip: "Big tower energy." },
];

export const budgets: Option[] = [
  { value: "$300 – $600", description: "1080p esports, school", art: "gpu-1", quip: "Big value, no cap." },
  { value: "$750 – $1,000", description: "Smooth 1080p / 1440p", art: "gpu-2", quip: "The sweet spot for most gamers." },
  { value: "$1,000+", description: "High-refresh 1440p / 4K", art: "gpu-3", quip: "Okay, we're going big." },
  { value: "Not sure yet", description: "We'll figure it out together", art: "gpu-unknown", quip: "No stress, we'll figure it out together." },
];

export const useCases: Option[] = [
  { value: "Gaming", icon: "gamepad", description: "Fortnite, Valorant, AAA", quip: "Say less. Frames incoming." },
  { value: "School / office", icon: "graduation", description: "Docs, browsing, Zoom", quip: "Fast, quiet, gets it done." },
  { value: "Video editing", icon: "video", description: "Premiere, DaVinci", quip: "Faster renders, here we come." },
  { value: "Streaming", icon: "monitor", description: "Play + stream at once", quip: "Chat's gonna love this." },
  { value: "3D / CAD", icon: "box", description: "Blender, CAD", quip: "Ooh, a creator." },
  { value: "Programming", icon: "code", description: "Code, apps, servers", quip: "Compile times about to drop." },
];

export const coolingOptions: Option[] = [
  { value: "Air cooler", description: "Quiet and reliable", art: "cool-air", quip: "Quiet and reliable. A classic." },
  { value: "Water cooling", description: "Cooler, cleaner look", art: "cool-water", quip: "Ice cold and clean." },
  { value: "Water cooling + LCD screen", label: "Water + screen", description: "Shows temps on the pump", art: "cool-lcd", quip: "A screen on your cooler? Flex." },
];

export const storageOptions: Option[] = [
  { value: "1 TB (a few games)", label: "A few games", description: "About 1 TB", art: "drive-1", quip: "Lean and clean." },
  { value: "2 TB (lots of games)", label: "Lots of games", description: "About 2 TB", art: "drive-2", quip: "Room for the whole library." },
  { value: "4 TB+ (everything)", label: "Everything", description: "4 TB+, videos too", art: "drive-4", quip: "Data hoarder mode: on." },
];

export const lightingOptions: Option[] = [
  { value: "No lights", description: "Clean and dark", art: "light-off", quip: "Stealth mode. Clean." },
  { value: "Subtle glow", description: "A soft accent", art: "light-subtle", quip: "Classy. Just enough glow." },
  { value: "Full RGB", description: "Light it up", art: "light-full", quip: "RGB adds 10 fps. Everyone knows that." },
];

export const havePartsOptions: Option[] = [
  { value: "No, starting fresh" },
  { value: "Some parts" },
  { value: "Yes, just need it assembled" },
];

export const backupOptions: Option[] = [
  { value: "Yes" },
  { value: "No" },
  { value: "Not sure" },
];

export const meetingMethods: Option[] = [
  { value: "Hunter comes to me", label: "Come to me", icon: "pin", description: "On or near campus" },
  { value: "Drop-off", label: "Drop-off", icon: "box", description: "Hand it over, pick it up later" },
  { value: "Call / video chat first", label: "Call first", icon: "video", description: "Plan it out together" },
];

export const contactPreferences: Option[] = [
  { value: "Text" },
  { value: "Email" },
  { value: "Call" },
];

/** Time slots in the date/time picker. Format "HH:mm" (24h), label is what's shown. */
export const timeSlots: Option[] = (() => {
  const out: Option[] = [];
  for (let h = 8; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) continue;
      const value = `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
      const hr12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ value, label: `${hr12}:${m === 0 ? "00" : "30"} ${h < 12 ? "AM" : "PM"}` });
    }
  }
  return out;
})();
