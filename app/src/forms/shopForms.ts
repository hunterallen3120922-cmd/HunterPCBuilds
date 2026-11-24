import type { FormConfig } from "../components/form/types";
import { contactStep } from "./shared";

const payoutOptions = [
  { value: "Trade-in credit", label: "Trade-in credit" },
  { value: "Cash or Zelle", label: "Cash or Zelle" },
];
const yesNo = [{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }];

/** "Send for a firm offer" on the trade-in page. `estimate` is the summary the page worked out. */
export function tradeInForm(estimate: string, payout: string, needsModel: boolean, negotiate = false): FormConfig {
  return {
    label: "Trade-in",
    steps: [
      {
        title: negotiate ? "Make me a counteroffer" : "Get a firm offer",
        sub: negotiate ? "Tell me what you think it's worth and why. I'll take a look and reply, usually within a day." : "I'll reply with a firm offer, usually within a day. Final price after I test it in person.",
        fields: [
          { name: "estimate", label: "Estimate from the site", kind: "static", defaultValue: estimate },
          ...(needsModel ? [{ name: "model", label: "What is it?", kind: "text" as const, required: true, requiredMessage: "Tell me the brand and model.", placeholder: "e.g. RTX 2080 Super, or a Dell XPS 15 from 2020" }] : []),
          { name: "payout", label: "How you'd like to be paid", kind: "select", options: payoutOptions, defaultValue: payout },
          negotiate
            ? { name: "notes", label: "What price did you have in mind?", kind: "textarea", required: true, requiredMessage: "Tell me the price you had in mind.", placeholder: "e.g. $200. Similar ones sold for that on eBay last week." }
            : { name: "notes", label: "Anything I should know?", hint: "(optional)", kind: "textarea", placeholder: "How old it is, any issues, what you're upgrading to…" },
        ],
      },
      contactStep,
    ],
  };
}

/** Reserve or ask about a shop item. `colors` (3D prints) adds a color choice. */
export function shopItemForm(item: string, mode: "reserve" | "ask", colors: string[] = []): FormConfig {
  return {
    label: mode === "reserve" ? "Shop hold" : "Shop question",
    steps: [
      {
        title: mode === "reserve" ? "Hold it for me" : "Ask about it",
        sub: mode === "reserve"
          ? colors.length ? "I'll print it in your color and text you when it's ready. Pay when you pick it up. No payment online." : "I'll hold it for 48 hours while we set up a time. No payment online."
          : "Ask anything: specs, condition, upgrades, a lower price.",
        fields: [
          { name: "item", label: "Item", kind: "static", defaultValue: item },
          ...(mode === "reserve" && colors.length ? [{ name: "color", label: "Color", kind: "select" as const, options: colors.map((c) => ({ value: c })), defaultValue: colors[0] }] : []),
          ...(mode === "reserve" && !colors.length ? [{ name: "credit", label: "Using trade-in credit?", kind: "select" as const, options: yesNo, defaultValue: "No" }] : []),
          { name: "notes", label: mode === "reserve" ? "Anything I should know?" : "Your question", hint: mode === "reserve" ? "(optional)" : undefined, kind: "textarea", required: mode === "ask", requiredMessage: "Type your question." },
        ],
      },
      contactStep,
    ],
  };
}

/** "Get notified" when nothing in the shop fits. */
export const notifyForm: FormConfig = {
  label: "Shop wishlist",
  steps: [
    {
      title: "Tell me what you're after",
      sub: "New stock comes in from trade-ins and repairs. I'll reach out when something fits.",
      fields: [
        { name: "wanted", label: "What are you looking for?", kind: "textarea", required: true, requiredMessage: "Tell me what you're looking for.", placeholder: "e.g. a 1080p gaming PC under $600, or a school laptop" },
      ],
    },
    contactStep,
  ],
};

/** "Send request" on the 3D Prints page. `summary` is what the page worked out (size, material, ballpark…). */
export function printRequestForm(summary: string, files: string[]): FormConfig {
  return {
    label: "Custom 3D print",
    steps: [
      {
        title: "Send your print request",
        sub: "I'll check it over and text you a firm price, usually within a day. Nothing is printed until you say yes.",
        fields: [
          { name: "request", label: "Your request", kind: "static", defaultValue: summary },
          ...(files.length ? [{ name: "files", label: "Files attached", kind: "static" as const, defaultValue: files.join(", ") }] : []),
          { name: "notes", label: "Anything else?", hint: "(optional)", kind: "textarea", placeholder: "When you need it by, links to the model, exact measurements…" },
        ],
      },
      contactStep,
    ],
  };
}

/** "Order" on a ready-made 3D print. `item` already includes the bundle and price, e.g. "Custom keycaps · 10 keycaps · $5". */
export function printOrderForm(item: string, colorNames: string[]): FormConfig {
  return {
    label: "3D print order",
    steps: [
      {
        title: "Order it",
        sub: "I'll text you to confirm, then print it. Most prints are ready in 2 to 5 days. Pay when you pick it up.",
        fields: [
          { name: "item", label: "Item", kind: "static", defaultValue: item },
          { name: "color", label: "Color", kind: "select", options: colorNames.map((c) => ({ value: c })), defaultValue: colorNames[0] },
          { name: "qty", label: "How many?", kind: "select", options: ["1", "2", "3", "4", "5", "More (tell me below)"].map((v) => ({ value: v })), defaultValue: "1" },
          { name: "notes", label: "Anything else?", hint: "(optional)", kind: "textarea", placeholder: "Your GPU model, the name or logo you want, when you need it by…" },
        ],
      },
      contactStep,
    ],
  };
}
