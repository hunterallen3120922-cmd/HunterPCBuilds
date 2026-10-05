import { backupOptions, deviceTypes } from "../content/formOptions";
import type { FormConfig } from "../components/form/types";
import type { RepairService } from "../types";
import { contactStep, meetingStep } from "./shared";

/** Short form shown when someone clicks a specific service on the Tech Repair page. */
export function serviceForm(service: RepairService): FormConfig {
  return {
    label: `Repair: ${service.name}`,
    steps: [
      {
        title: `Request: ${service.name}`,
        sub: "Tell me about the device so I can give you a firm quote.",
        fields: [
          { name: "service", label: "Service", kind: "static", defaultValue: `${service.name} (${service.price}${service.plusParts ? " + parts" : ""})` },
          { name: "deviceType", label: "Device type", kind: "select", options: deviceTypes, required: true, requiredMessage: "Choose your device type." },
          { name: "deviceModel", label: "Brand & model", hint: "(if you know it)", kind: "text", placeholder: "e.g. HP Pavilion 15" },
          { name: "notes", label: "Anything I should know?", hint: "(optional)", kind: "textarea", placeholder: "Symptoms, error messages, when it started…" },
          { name: "dataBackedUp", label: "Is your important data backed up?", kind: "select", options: backupOptions, defaultValue: "Yes" },
        ],
      },
      meetingStep,
      contactStep,
    ],
  };
}
