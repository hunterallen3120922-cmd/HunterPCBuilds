import { backupOptions, deviceTypes } from "../content/formOptions";
import type { FormConfig } from "../components/form/types";
import { contactStep, meetingStep } from "./shared";

/** Questions on the Tech Repair page. */
export const repairForm: FormConfig = {
  label: "Repair",
  steps: [
    {
      title: "What needs fixing?",
      sub: "Pick the closest device type.",
      fields: [
        { name: "deviceType", label: "Device type", kind: "choice", options: deviceTypes, required: true, requiredMessage: "Choose your device type." },
        { name: "deviceModel", label: "Brand & model", hint: "(if you know it)", kind: "text", placeholder: "e.g. HP Pavilion 15" },
      ],
    },
    {
      title: "Tell me about the problem",
      sub: "The more detail, the better the quote.",
      fields: [
        { name: "problem", label: "Describe the problem", kind: "textarea", placeholder: "What happened? When did it start? Any error messages?", required: true, minLength: 5, requiredMessage: "Add a short description." },
        { name: "dataBackedUp", label: "Is your important data backed up?", kind: "select", options: backupOptions, defaultValue: "Yes" },
      ],
    },
    meetingStep,
    contactStep,
  ],
};
