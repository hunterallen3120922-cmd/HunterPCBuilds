import { budgets, caseSizes, coolingOptions, havePartsOptions, lightingOptions, storageOptions, useCases } from "../content/formOptions";
import type { FormConfig } from "../components/form/types";
import { contactStep, meetingStep } from "./shared";
import { buildTiers } from "../content/buildTiers";
import type { BuildTier } from "../types";
import Workbench, { PART_STEPS } from "../components/build/Workbench";

/** How a package shows up in the form's "Package" question (and in your emails/requests). */
export const packageLabel = (t: BuildTier) => `${t.name} (${t.budget})`;
export const CUSTOM_PACKAGE = "Custom (we'll plan it together)";

const part = (n: number) => `Part ${n} of ${PART_STEPS}`;

/**
 * Questions on the PC Builds page. The first six each install a part in the PC drawing beside the form
 * (components/build/Workbench.tsx), then the visitor powers it on and adds notes. Keep those six in this order.
 */
export const buildForm: FormConfig = {
  label: "Build",
  aside: Workbench,
  steps: [
    {
      eyebrow: part(1), title: "First, pick a case", sub: "Pick a size and watch the case change.", next: "Install case",
      fields: [{ name: "caseSize", label: "Case size", kind: "cards", options: caseSizes, required: true, requiredMessage: "Pick a case size." }],
    },
    {
      eyebrow: part(2), title: "What will it do?", sub: "This decides the brain of your PC (motherboard and CPU). Tap all that apply.", next: "Install CPU",
      fields: [{ name: "useCases", label: "What will you use it for?", kind: "cards", multi: true, options: useCases, required: true, requiredMessage: "Pick at least one." }],
    },
    {
      eyebrow: part(3), title: "Pick your budget", sub: "Your budget sets the graphics card. Watch it change size.", next: "Install graphics card",
      fields: [{ name: "budget", label: "Total budget", kind: "cards", options: budgets, required: true, requiredMessage: "Choose a budget range." }],
    },
    {
      eyebrow: part(4), title: "How should it stay cool?", sub: "Not sure? Air is quiet and reliable.", next: "Install cooling",
      fields: [{ name: "cooling", label: "Cooling", kind: "cards", options: coolingOptions, required: true, requiredMessage: "Pick one." }],
    },
    {
      eyebrow: part(5), title: "How much stuff will you keep?", sub: "Games, videos, school files…", next: "Install storage",
      fields: [{ name: "storage", label: "Storage", kind: "cards", options: storageOptions, required: true, requiredMessage: "Pick one." }],
    },
    {
      eyebrow: part(6), title: "Last part: lighting", sub: "Then plug it in and power it on.", next: "Install power supply",
      fields: [{ name: "lighting", label: "Lighting", kind: "cards", options: lightingOptions, required: true, requiredMessage: "Pick one." }],
    },
    {
      eyebrow: "Moment of truth", title: "Power it on", sub: "Press the power button on your PC. Then anything else I should know: games you play, colors, must-have parts…",
      fields: [
        { name: "preferences", label: "Preferences & notes", hint: "(optional)", kind: "textarea", placeholder: "e.g. I play Valorant and Fortnite, want a white case" },
        { name: "package", label: "Package", kind: "select", options: [...buildTiers.map((t) => ({ value: packageLabel(t) })), { value: CUSTOM_PACKAGE }], defaultValue: CUSTOM_PACKAGE },
        { name: "havePartsAlready", label: "Do you have parts already?", kind: "select", options: havePartsOptions, defaultValue: "No, starting fresh" },
      ],
    },
    meetingStep,
    contactStep,
  ],
};
