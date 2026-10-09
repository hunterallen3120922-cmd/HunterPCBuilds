import type { FormConfig } from "../components/form/types";
import type { FormValues, PreferredWindow } from "../types";
import { site } from "../content/site";
import { insertRequest, supabaseReady } from "./supabase";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const accessKey = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;

function asText(v: FormValues[string] | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  return (v as (string | PreferredWindow)[])
    .map((x) => (typeof x === "string" ? x : x.date && x.time ? `${x.date} at ${x.time}` : ""))
    .filter(Boolean)
    .join("\n");
}

/** Sends the request to the owner's inbox through Web3Forms. */
async function sendEmail(config: FormConfig, values: FormValues): Promise<void> {
  const name = asText(values.name) || "Customer";
  const shortName = name.replace(/\s+/g, " ").split(" ").map((p, i, a) => (i === a.length - 1 && a.length > 1 ? `${p[0]}.` : p)).join(" ");

  const payload: Record<string, string> = {
    access_key: accessKey!,
    subject: `New ${config.label} request – ${shortName}`,
    from_name: `${site.name} Website`,
    replyto: asText(values.email),
    botcheck: "",
  };
  // Every field gets a clearly labeled line in the email
  for (const f of config.steps.flatMap((s) => s.fields)) {
    const text = asText(values[f.name]);
    if (text) payload[f.label] = text;
  }
  payload["Agreed to terms"] = "Yes";

  const res = await fetch(WEB3FORMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!data.success) throw new Error(data.message || "Email failed");
}

/** Every answer with its label, as saved in the admin portal's Requests tab. */
function labeledAnswers(config: FormConfig, values: FormValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of config.steps.flatMap((s) => s.fields)) {
    const text = asText(values[f.name]);
    if (text) out[f.label] = text;
  }
  return out;
}

/** Saves the request to the database so it shows in the admin portal. */
async function saveToPortal(type: "build" | "repair", config: FormConfig, values: FormValues): Promise<void> {
  await insertRequest({
    type,
    name: asText(values.name).slice(0, 200),
    email: asText(values.email).slice(0, 320),
    phone: asText(values.phone).slice(0, 60),
    fields: { "Request type": config.label, ...labeledAnswers(config, values) },
  });
}

/**
 * Sends a request two ways at once: by email (Web3Forms) and into the admin portal (Supabase).
 * It counts as sent if either works, and only fails if both do.
 * With neither set up, `npm run dev` simulates success; the live site reports an error.
 */
export async function submitRequest(type: "build" | "repair", config: FormConfig, values: FormValues): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (accessKey) tasks.push(sendEmail(config, values));
  if (supabaseReady) tasks.push(saveToPortal(type, config, values));
  if (tasks.length === 0) {
    if (import.meta.env.DEV) {
      console.info("[dev] no Web3Forms key or Supabase set; request would be sent:", config.label, values);
      await new Promise((r) => setTimeout(r, 600));
      return;
    }
    throw new Error("The request form isn't connected yet.");
  }
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  failed.forEach((f) => console.error("Request delivery problem:", f.reason));
  if (failed.length === results.length) throw failed[0].reason;
}
