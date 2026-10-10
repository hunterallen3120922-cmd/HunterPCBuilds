/**
 * PARTS FOR THE HIGH PERFORMANCE ($1,000+) BUILDER on the PC Builds page.
 * Customers pick a budget with a slider; the site picks a balanced set of these parts that fits under it, and
 * they can swap any part from a dropdown. Edit names and prices freely, keep them in order from cheapest to best.
 *
 *   needsWatts  the smallest power supply that part needs (the builder never pairs it with a smaller one)
 *   watts       what a power supply provides
 *   auto: false not chosen automatically (still available in the dropdown), e.g. the Mini case is a size choice
 */
export interface Part { name: string; price: number; needsWatts?: number; watts?: number; auto?: boolean }

export const customParts = {
  gpu: [
    { name: "RTX 3070", price: 300, needsWatts: 650 },
    { name: "RTX 4070", price: 450, needsWatts: 650 },
    { name: "RTX 5070", price: 550, needsWatts: 650 },
    { name: "RTX 5070 Ti", price: 1200, needsWatts: 750 },
    { name: "RTX 5080", price: 1900, needsWatts: 850 },
  ] as Part[],
  /** CPU + motherboard + RAM, sold together */
  cpu: [
    { name: "Ryzen 7 7700 + B650 motherboard + 16 GB DDR5", price: 400 },
    { name: "Intel Core 7 270 + B860 motherboard + 16 GB DDR5", price: 600 },
    { name: "Ryzen 7 7800X3D + B650 motherboard + 32 GB DDR5", price: 800 },
    { name: "Ryzen 9 9850X3D + B850 motherboard + 32 GB DDR5", price: 950 },
  ] as Part[],
  storage: [
    { name: "512 GB NVMe + 1 TB SATA SSD", price: 150 },
    { name: "1 TB NVMe SSD", price: 160 },
    { name: "1 TB NVMe + 1 TB SATA SSD", price: 220 },
    { name: "2 TB NVMe SSD", price: 300 },
    { name: "4.5 TB (512 GB NVMe + 4× 1 TB SATA SSD)", price: 400 },
  ] as Part[],
  psu: [
    { name: "650W power supply", price: 60, watts: 650 },
    { name: "750W power supply", price: 100, watts: 750 },
    { name: "850W power supply", price: 130, watts: 850 },
    { name: "1000W power supply", price: 200, watts: 1000 },
  ] as Part[],
  case: [
    { name: "Medium case (Micro-ATX)", price: 75 },
    { name: "Large case (ATX / E-ATX)", price: 130 },
    { name: "Mini case (ITX)", price: 120, auto: false },
  ] as Part[],
  cooling: [
    { name: "Standard air cooling", price: 0 },
    { name: "Water cooling", price: 60 },
    { name: "Water cooling with LCD screen on the pump", price: 160 },
  ] as Part[],
};

/** The slider's range, in dollars. The top end means "$3,000 or more". */
export const BUILDER_MIN = 1000;
export const BUILDER_MAX = 3000;
export const BUILDER_STEP = 50;
