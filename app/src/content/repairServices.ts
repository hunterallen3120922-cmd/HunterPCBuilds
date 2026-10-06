import type { RepairService } from "../types";

/**
 * REPAIR SERVICES & PRICES.
 * To add a service, copy one { ... } block and paste it in the list.
 */
export const repairServices: RepairService[] = [
  { icon: "search", name: "Diagnostic", description: "Figure out what's wrong", price: "Free" },
  { icon: "shield-check", name: "Virus / malware cleanup", description: "Remove junk, speed it up", price: "$40" },
  { icon: "disc", name: "Windows reinstall", description: "Fresh install + drivers", price: "$40" },
  { icon: "chip", name: "SSD or RAM upgrade", description: "Install + data transfer", price: "$25", plusParts: true },
  { icon: "battery", name: "Laptop battery swap", description: "Most models", price: "$30", plusParts: true },
  { icon: "monitor", name: "Laptop screen replacement", description: "Most models", price: "$50", plusParts: true },
  { icon: "fan", name: "Deep clean + thermal paste", description: "Fix overheating & fan noise", price: "$30" },
];

export const repairNote =
  "Parts are charged at cost. Applicable PA sales tax is added to the total.";

/** "Devices I work on" list. */
export const devicesServed = [
  "Windows laptops",
  "Desktop PCs",
  "Custom-built gaming PCs",
  "MacBooks (software issues; hardware is limited on newer models)",
  "Gaming consoles (cleaning & basic repairs)",
];

export const backupNotice =
  "Back up anything important before handing over a device. I only touch what's needed for the repair, but I can't be responsible for data loss.";
