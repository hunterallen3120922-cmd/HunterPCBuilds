/**
 * SITE-WIDE INFO. Edit the text between the quotes.
 */
export const site = {
  name: "HunterPCBuilds",
  fullName: "HunterPCBuilds Tech Repair",
  tagline: "Student-run computer repair & custom PC builds in York, PA",
  /** Public contact email shown to customers. Leave "" to hide it everywhere. (Request emails go to the inbox set in Web3Forms.) */
  contactEmail: "",
  serviceArea: "York, PA and the York College of Pennsylvania area",
  paymentMethods: ["Cash", "Zelle"],
  social: {
    // Leave a value as "" to hide that link.
    instagram: "",
    tiktok: "",
    facebook: "",
  },
  footerDisclaimer:
    "Independent student service · Not affiliated with York College of Pennsylvania",
  responseTime: "I aim to reply within 24 hours.",
  /** Small line above the hero headline */
  localTag: "York, PA · The White Rose City",
  /** The "Local, not a call center" section on the home page */
  localTitle: "Local, not a call center.",
  localText:
    "I'm a student in York, so repairs happen close to home: at your place, on or near campus, or at a quick drop-off. You get a real person who answers your texts, explains what's wrong, and doesn't upsell.",
};

/** The "at a glance" card in the home page hero. Add or remove rows freely. */
export const glance = [
  { label: "Based in", value: "York, PA" },
  { label: "Reply time", value: "Usually within 24 hours" },
  { label: "Diagnostics", value: "Free" },
  { label: "Labor guarantee", value: "30 days" },
  { label: "Payment", value: "Cash or Zelle" },
];

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
  { icon: "graduation", title: "Student-run", text: "A real student who gets the budget. No upselling." },
  { icon: "tag", title: "Fair prices", text: "Parts at cost, a firm quote before I start." },
  { icon: "chat", title: "Plain English", text: "I explain what's wrong and what it'll take to fix." },
  { icon: "shield-check", title: "30-day labor guarantee", text: "Same issue comes back? I fix it free." },
];
