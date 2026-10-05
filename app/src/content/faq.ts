import type { FaqItem } from "../types";

/**
 * FAQ & TERMS. One block per question.
 * `preview: true` also shows it on the home page.
 */
export const faq: FaqItem[] = [
  {
    question: "Do you fix Macs?",
    answer:
      "Software issues, yes. Hardware on newer MacBooks is limited because many parts are soldered. Send a request and I'll tell you honestly what's possible.",
  },
  {
    question: "How do I pay?",
    answer:
      "Cash, Venmo or Zelle when the job is done. For builds, parts are paid up front so I can order them.",
    preview: true,
  },
  {
    question: "How long do builds take?",
    answer:
      "Usually 2–5 days after parts arrive. Repairs like cleanups and upgrades often happen same-day.",
    preview: true,
  },
  {
    question: "Will you look at my files?",
    answer:
      "No. I only touch what's needed for the repair. Back up anything important before handing over a device. If I replace a drive, I'll give the old one back or wipe it.",
    preview: true,
  },
  {
    question: "Is there a warranty?",
    answer:
      "My labor is guaranteed for 30 days. If the same issue comes back, I'll fix it free. New parts carry the manufacturer's warranty.",
    preview: true,
  },
  {
    question: "Are you affiliated with York College?",
    answer:
      "No. HunterPCBuilds is an independent, student-run service and is not affiliated with, endorsed by, or operated by York College of Pennsylvania.",
  },
  {
    question: "Terms",
    answer:
      "HunterPCBuilds is an independent, student-run service and is not affiliated with, endorsed by, or operated by York College of Pennsylvania. You are responsible for backing up your data. HunterPCBuilds is not liable for data loss, pre-existing damage, or failures of third-party parts. Devices not picked up within 30 days of completion may be recycled.",
  },
];
