import type { BuildTier } from "../types";

/**
 * PC BUILD PACKAGES. These are EXAMPLES. Replace the specs with what you
 * actually recommend. To add a tier, copy one { ... } block.
 */
export const buildTiers: BuildTier[] = [
  {
    name: "Starter",
    budget: "Under $900",
    bestFor: "School, browsing, and 1080p esports gaming",
    exampleSpecs: ["6-core CPU", "16 GB RAM", "500 GB NVMe SSD", "Entry-level graphics card"],
    laborPrice: "$75",
  },
  {
    name: "Performance",
    budget: "$900 – $1,300",
    bestFor: "1080p/1440p gaming and streaming",
    exampleSpecs: ["8-core CPU", "16–32 GB RAM", "1 TB NVMe SSD", "Mid-range graphics card"],
    laborPrice: "$75",
  },
  {
    name: "Enthusiast",
    budget: "$1,300 – $2,000+",
    bestFor: "High-refresh 1440p/4K, video editing, 3D / CAD",
    exampleSpecs: ["Fast 8–16 core CPU", "32 GB RAM", "2 TB NVMe SSD", "High-end graphics card"],
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
