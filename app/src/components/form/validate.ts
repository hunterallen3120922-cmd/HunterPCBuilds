import type { PreferredWindow } from "../../types";
import type { Errors, FieldDef, FormValues } from "./types";

const emailRe = /^\S+@\S+\.\S+$/;

export function validateStep(fields: FieldDef[], values: FormValues): Errors {
  const errors: Errors = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.kind === "windows") {
      const wins = (v as PreferredWindow[]) ?? [];
      const filled = wins.filter((w) => w.date && w.time);
      const half = wins.some((w) => (w.date && !w.time) || (!w.date && w.time));
      if (half) errors[f.name] = "Pick both a date and a time, or remove the empty row.";
      else if (f.required && filled.length === 0) errors[f.name] = f.requiredMessage ?? "Suggest at least one date and time.";
      else {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (filled.some((w) => new Date(`${w.date}T00:00`) < today)) errors[f.name] = "Dates need to be today or later.";
      }
      continue;
    }
    const s = Array.isArray(v) ? "" : String(v ?? "").trim();
    const empty = f.kind === "pills" ? !(Array.isArray(v) && v.length) : s === "";
    if (f.required && empty) { errors[f.name] = f.requiredMessage ?? "This is required."; continue; }
    if (empty) continue;
    if (f.kind === "email" && !emailRe.test(s)) errors[f.name] = "Enter a valid email address.";
    else if (f.minLength && s.length < f.minLength) errors[f.name] = `Add a little more detail (at least ${f.minLength} characters).`;
  }
  return errors;
}
