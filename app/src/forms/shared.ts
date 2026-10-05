import { contactPreferences, meetingMethods } from "../content/formOptions";
import type { FieldDef, StepDef } from "../components/form/types";

/** Meeting + scheduling step, shared by both forms. */
export const meetingStep: StepDef = {
  title: "How should we meet?",
  sub: "Pick what works for you. I'll confirm the exact time.",
  fields: [
    { name: "meeting", label: "Meeting method", kind: "choice", options: meetingMethods, required: true, requiredMessage: "Pick how you'd like to meet." },
    { name: "location", label: "Where?", hint: "(dorm/building, or area of York)", kind: "text", placeholder: "e.g. near the library" },
    { name: "availability", label: "Preferred date & time", hint: "(suggest up to 3, I'll confirm one)", kind: "windows", required: true, requiredMessage: "Suggest at least one date and time that works for you." },
  ],
};

const nameField: FieldDef = { name: "name", label: "Name", kind: "text", required: true, requiredMessage: "Enter your name." };

/** Contact step, shared by both forms. */
export const contactStep: StepDef = {
  title: "How do I reach you?",
  sub: "Only used to reply about your request.",
  fields: [
    nameField,
    { name: "email", label: "Email", kind: "email", required: true, requiredMessage: "Enter a valid email." },
    { name: "phone", label: "Phone", hint: "(optional)", kind: "tel" },
    { name: "contactPreference", label: "Best way to reach you", kind: "select", options: contactPreferences, defaultValue: "Text" },
  ],
};
