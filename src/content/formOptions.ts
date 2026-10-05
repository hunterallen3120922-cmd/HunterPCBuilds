import type { Option } from "../types";

/**
 * CHOICES SHOWN IN THE REQUEST FORMS.
 * Add or remove lines to change what customers can pick.
 * (If you leave out `label`, the `value` is shown.)
 */
export const deviceTypes: Option[] = [
  { value: "Windows laptop", icon: "💻", description: "HP, Dell, Lenovo, ASUS…" },
  { value: "MacBook", icon: "🍎", description: "Software issues mostly" },
  { value: "Desktop PC", icon: "🖥️", description: "Tower or all-in-one" },
  { value: "Gaming console", icon: "🎮", description: "Cleaning & basic repair" },
  { value: "Phone / tablet", icon: "📱", description: "Ask first, limited" },
  { value: "Other", icon: "❓", description: "Tell me about it" },
];

export const budgets: Option[] = [
  { value: "Under $600" },
  { value: "$600 – $900" },
  { value: "$900 – $1,300" },
  { value: "$1,300 – $2,000" },
  { value: "$2,000+" },
];

export const useCases: Option[] = [
  { value: "Gaming" },
  { value: "School / office" },
  { value: "Video editing" },
  { value: "Streaming" },
  { value: "3D / CAD" },
  { value: "Programming" },
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
  { value: "Hunter comes to me", label: "Come to me", icon: "🚶", description: "On or near campus" },
  { value: "Drop-off", label: "Drop-off", icon: "📦", description: "Hand it over, pick it up later" },
  { value: "Call / video chat first", label: "Call first", icon: "📞", description: "Plan it out together" },
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
