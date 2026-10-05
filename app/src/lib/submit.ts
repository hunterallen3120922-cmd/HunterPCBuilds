import type { FormConfig } from "../components/form/types";
import type { FormValues, PreferredWindow } from "../types";
import { site } from "../content/site";

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

/**
 * Phase 3 (email): sends through Web3Forms.
 * Still to come: also saving to Supabase (then only fail if BOTH fail).
 * With no key set, `npm run dev` simulates success; the live site reports an error.
 */
export async function submitRequest(_type: "build" | "repair", config: FormConfig, values: FormValues): Promise<void> {
  if (!accessKey) {
    if (import.meta.env.DEV) {
      console.info("[dev] no Web3Forms key set; request would be sent:", config.label, values);
      await new Promise((r) => setTimeout(r, 600));
      return;
    }
    throw new Error("The request form isn't connected yet.");
  }
  try {
    await sendEmail(config, values);
  } catch (err) {
    console.error("Email send failed:", err);
    throw err;
  }
}
