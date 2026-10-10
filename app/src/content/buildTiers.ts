import type { BuildTier } from "../types";

/**
 * PC BUILD PACKAGES (the cards on the PC Builds page).
 * Clicking a card shows its description and recommended specs, and "Build now" starts a build request with
 * that package and its specs already filled in. Edit freely; to add a tier, copy one { ... } block.
 */
export const buildTiers: BuildTier[] = [
  {
    name: "Budget",
    budget: "$300 – $600",
    bestFor: "School, everyday use and 1080p esports gaming",
    description:
      "The most PC for the least money. Great for schoolwork, streaming, and popular games like Fortnite, Valorant and Minecraft at 1080p. Easy to upgrade later.",
    recommendedSpecs: ["GTX 1660 graphics card"],
    laborPrice: "$75",
  },
  {
    name: "Midrange",
    budget: "$750 – $1,000",
    bestFor: "Smooth 1080p/1440p gaming and streaming",
    description:
      "The sweet spot for most gamers: high settings at 1080p, solid 1440p, and enough power to stream or record while you play.",
    recommendedSpecs: ["6–8 core CPU", "16–32 GB RAM", "1 TB NVMe SSD", "Mid-range graphics card"],
    laborPrice: "$75",
  },
  {
    name: "High performance",
    budget: "$1,000+",
    bestFor: "High-refresh 1440p/4K, video editing and 3D work",
    description:
      "No compromises: high frame rates at 1440p and 4K, fast video editing and 3D work, with room to grow for years.",
    recommendedSpecs: ["Fast 8–16 core CPU", "32 GB RAM", "2 TB NVMe SSD", "High-end graphics card"],
    laborPrice: "$75",
  },
];

export const buildIncludes = [
  "Parts planning for your budget (free consultation)",
  "Full assembly and clean cable management",
  "Windows install, drivers and updates",
  "Stress testing before handoff",
  "A quick walkthrough of how to use and maintain it",
  "30-day labor guarantee",
];

export const buildProcess = [
  { title: "Consult", text: "Tell me your budget and what you'll use it for." },
  { title: "Parts approved & paid", text: "I send a parts list. You approve it and pay so I can order." },
  { title: "Build", text: "I assemble it, manage the cables and install Windows." },
  { title: "Testing", text: "Stress tests and temperature checks before it leaves my desk." },
  { title: "Handoff", text: "I deliver it, walk you through it, and you pay the labor." },
];
