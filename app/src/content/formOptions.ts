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
  { value: "ITX (mini)", label: "ITX", description: "Mini. Fits a small desk or dorm", art: "case-itx" },
  { value: "Micro-ATX", description: "Compact tower, great value", art: "case-matx" },
  { value: "ATX (full size)", label: "ATX", description: "Full size, most room + airflow", art: "case-atx" },
];

export const budgets: Option[] = [
  { value: "$300 – $600", description: "1080p esports, school", art: "gpu-1" },
  { value: "$750 – $1,000", description: "Smooth 1080p / 1440p", art: "gpu-2" },
  { value: "$1,000+", description: "High-refresh 1440p / 4K", art: "gpu-3" },
  { value: "Not sure yet", description: "We'll figure it out together", art: "gpu-unknown" },
];

export const useCases: Option[] = [
  { value: "Gaming", icon: "gamepad", description: "Fortnite, Valorant, AAA" },
  { value: "School / office", icon: "graduation", description: "Docs, browsing, Zoom" },
  { value: "Video editing", icon: "video", description: "Premiere, DaVinci" },
  { value: "Streaming", icon: "monitor", description: "Play + stream at once" },
  { value: "3D / CAD", icon: "box", description: "Blender, CAD" },
  { value: "Programming", icon: "code", description: "Code, apps, servers" },
];

export const coolingOptions: Option[] = [
  { value: "Air cooler", description: "Quiet and reliable", art: "cool-air" },
  { value: "Water cooling", description: "Cooler, cleaner look", art: "cool-water" },
  { value: "Water cooling + LCD screen", label: "Water + screen", description: "Shows temps on the pump", art: "cool-lcd" },
];

export const storageOptions: Option[] = [
  { value: "1 TB (a few games)", label: "A few games", description: "About 1 TB", art: "drive-1" },
  { value: "2 TB (lots of games)", label: "Lots of games", description: "About 2 TB", art: "drive-2" },
  { value: "4 TB+ (everything)", label: "Everything", description: "4 TB+, videos too", art: "drive-4" },
];

export const lightingOptions: Option[] = [
  { value: "No lights", description: "Clean and dark", art: "light-off" },
  { value: "Subtle glow", description: "A soft accent", art: "light-subtle" },
  { value: "Full RGB", description: "Light it up", art: "light-full" },
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
