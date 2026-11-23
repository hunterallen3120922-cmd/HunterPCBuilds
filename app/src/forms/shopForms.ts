import type { FormConfig } from "../components/form/types";
import { contactStep } from "./shared";

const payoutOptions = [
  { value: "Trade-in credit", label: "Trade-in credit" },
  { value: "Cash or Zelle", label: "Cash or Zelle" },
];
const yesNo = [{ value: "No", label: "No" }, { value: "Yes", label: "Yes" }];

/** "Send for a firm offer" on the trade-in page. `estimate` is the summary the page worked out. */
export function tradeInForm(estimate: string, payout: string, needsModel: boolean): FormConfig {
  return {
    label: "Trade-in",
    steps: [
      {
        title: "Get a firm offer",
        sub: "I'll reply with a firm offer, usually within a day. Final price after I test it in person.",
        fields: [
          { name: "estimate", label: "Estimate from the site", kind: "static", defaultValue: estimate },
          ...(needsModel ? [{ name: "model", label: "What is it?", kind: "text" as const, required: true, requiredMessage: "Tell me the brand and model.", placeholder: "e.g. RTX 2080 Super, or a Dell XPS 15 from 2020" }] : []),
          { name: "payout", label: "How you'd like to be paid", kind: "select", options: payoutOptions, defaultValue: payout },
          { name: "notes", label: "Anything I should know?", hint: "(optional)", kind: "textarea", placeholder: "How old it is, any issues, what you're upgrading to…" },
        ],
      },
      contactStep,
    ],
  };
}

/** Reserve or ask about a shop item. */
export function shopItemForm(item: string, mode: "reserve" | "ask"): FormConfig {
  return {
    label: mode === "reserve" ? "Shop hold" : "Shop question",
    steps: [
      {
        title: mode === "reserve" ? "Hold it for me" : "Ask about it",
        sub: mode === "reserve" ? "I'll hold it for 48 hours while we set up a time. No payment online." : "Ask anything: specs, condition, upgrades, a lower price.",
        fields: [
          { name: "item", label: "Item", kind: "static", defaultValue: item },
          ...(mode === "reserve" ? [{ name: "credit", label: "Using trade-in credit?", kind: "select" as const, options: yesNo, defaultValue: "No" }] : []),
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
