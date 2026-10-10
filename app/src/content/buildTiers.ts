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
    recommendedSpecs: ["GTX 1660 graphics card", "Core i7 7th gen OR Ryzen 5 (AM4)", "512 GB SSD", "16 GB DDR4 RAM", "650W power supply"],
    laborPrice: "$75",
  },
  {
    name: "Midrange",
    budget: "$750 – $1,000",
    bestFor: "Smooth 1080p/1440p gaming and streaming",
    description:
      "The sweet spot for most gamers: high settings at 1080p, solid 1440p, and enough power to stream or record while you play.",
    recommendedSpecs: ["RTX 3060 graphics card", "Ryzen 7 (AM4)", "512 GB NVMe SSD + 1 TB SSD", "32 GB DDR4 RAM", "650W – 750W power supply"],
    laborPrice: "$75",
  },
  {
    name: "High performance",
    budget: "$1,000+",
    bestFor: "High-refresh 1440p/4K, video editing and 3D work",
    description:
      "No compromises: high frame rates at 1440p and 4K, fast video editing and 3D work, with room to grow for years. Slide to your budget and I'll match balanced parts to it, or swap any part yourself.",
    recommendedSpecs: ["Choose your budget: $1,000 to $3,000+", "RTX 3070 up to RTX 5080", "Ryzen 7 / Intel Core 7 / Ryzen 9 X3D, DDR5", "Up to 4.5 TB storage", "Optional water cooling + LCD"],
    builder: true,
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
