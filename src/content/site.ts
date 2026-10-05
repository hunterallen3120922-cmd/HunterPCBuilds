/**
 * SITE-WIDE INFO. Edit the text between the quotes.
 */
export const site = {
  name: "HunterPCBuilds",
  fullName: "HunterPCBuilds Tech Repair",
  tagline: "Student-run computer repair & custom PC builds in York, PA",
  /** Where request emails are described to customers (the real inbox is set in Web3Forms) */
  contactEmail: "hunterpcbuilds@example.com",
  serviceArea: "York, PA and the York College of Pennsylvania area",
  paymentMethods: ["Cash", "Venmo", "Zelle"],
  social: {
    // Leave a value as "" to hide that link.
    instagram: "",
    tiktok: "",
    facebook: "",
  },
  footerDisclaimer:
    "Independent student service · Not affiliated with York College of Pennsylvania",
  responseTime: "I'll get back to you within 24 hours.",
};

/** "How it works" cards on the home page. */
export const howItWorks = [
  {
    title: "Tell me what's up",
    text: "Fill out the request form. Describe the problem or the build you want. Takes about two minutes.",
  },
  {
    title: "Pick how we meet",
    text: "I come to you, you drop it off, or we plan a build over a quick call. I'll confirm a time and a quote.",
  },
  {
    title: "Fixed or built",
    text: "Simple fixes often happen on the spot. Bigger repairs and builds get done and handed back when ready.",
  },
];

/** The trust strip on the home page. */
export const trustPoints = [
  { icon: "🎓", title: "Student-run", text: "A real student who gets the budget. No upselling." },
  { icon: "💵", title: "Fair prices", text: "Parts at cost, a firm quote before I start." },
  { icon: "💬", title: "Plain English", text: "I explain what's wrong and what it'll take to fix." },
  { icon: "🛡️", title: "30-day labor guarantee", text: "Same issue comes back? I fix it free." },
];
