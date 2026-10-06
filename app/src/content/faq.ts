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
      "Cash or Zelle when the job is done. For builds, parts are paid up front so I can order them. Zelle payments can't be reversed, so double-check the details before you send.",
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
      "I don't browse or share your personal files. I only access what the repair needs (for example, copying your data to a new drive when you ask me to). Back up anything important before handing over a device. If I replace a drive, I'll give the old one back or wipe it.",
    preview: true,
  },
  {
    question: "Is there a warranty?",
    answer:
      "My labor is guaranteed for 30 days. If the same problem comes back on the same device, I'll fix it free. This doesn't cover physical or liquid damage, new unrelated problems, or software you install yourself. New parts carry the manufacturer's warranty, so keep your receipt.",
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
      "HunterPCBuilds is an independent, student-run service and is not affiliated with, endorsed by, or operated by York College of Pennsylvania. You are responsible for backing up your data before service. To the extent the law allows, HunterPCBuilds is not responsible for data loss, pre-existing damage, or failures of third-party parts, and total liability for any job is limited to the amount you paid for that job. Nothing here limits rights you have under Pennsylvania or federal law. Requests are for people 18 or older, or with a parent or guardian's permission. See also the Privacy notice.",
  },
];
