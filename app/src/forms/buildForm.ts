import { budgets, havePartsOptions, useCases } from "../content/formOptions";
import type { FormConfig } from "../components/form/types";
import { contactStep, meetingStep } from "./shared";
import { buildTiers } from "../content/buildTiers";
import type { BuildTier } from "../types";

/** How a package shows up in the form's "Package" question (and in your emails/requests). */
export const packageLabel = (t: BuildTier) => `${t.name} (${t.budget})`;
export const CUSTOM_PACKAGE = "Custom (we'll plan it together)";

/** Questions on the PC Builds page. */
export const buildForm: FormConfig = {
  label: "Build",
  steps: [
    {
      title: "Plan your build",
      sub: "A rough idea is fine. I'll help you narrow it down.",
      fields: [
        { name: "package", label: "Package", kind: "select", options: [...buildTiers.map((t) => ({ value: packageLabel(t) })), { value: CUSTOM_PACKAGE }], defaultValue: CUSTOM_PACKAGE },
        { name: "budget", label: "Total budget", kind: "select", options: budgets, required: true, requiredMessage: "Choose a budget range." },
        { name: "useCases", label: "What will you use it for?", hint: "(pick any)", kind: "pills", options: useCases },
        { name: "havePartsAlready", label: "Do you have parts already?", kind: "select", options: havePartsOptions, defaultValue: "No, starting fresh" },
      ],
    },
    {
      title: "Anything else I should know?",
      sub: "Games you play, size/looks you like, must-have parts, RGB or no RGB…",
      fields: [
        { name: "preferences", label: "Preferences & notes", kind: "textarea", placeholder: "e.g. I play Valorant and Fortnite, want a white case, no RGB", required: true, minLength: 5, requiredMessage: "Add a short note." },
      ],
    },
    meetingStep,
    contactStep,
  ],
};
