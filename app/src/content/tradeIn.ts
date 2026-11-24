/**
 * TRADE-IN PRICE LIST. You keep these numbers up to date yourself, so there is no paid price API.
 *
 * Each number is roughly what one that WORKS FINE recently SOLD for used (eBay sold listings), in dollars.
 * The site pays `tradeInRate` of that (0.7 = 30% under sold price), then adjusts for condition and extras.
 * Check eBay *sold* listings every couple of weeks and change the numbers that moved.
 *
 * To add a part: find its group below and add  ["Name", soldPrice],  on a new line.
 */
export const tradeInUpdated = "Nov 2026";

/** What you pay compared with the recent sold price. 0.7 = 30% lower. */
export const tradeInRate = 0.7;

/** Trade-in credit is worth this much more than cash (0.15 = 15% more). */
export const creditBonus = 0.15;

export const partTypes = [
  { id: "gpu", label: "Graphics card", icon: "monitor" },
  { id: "cpu", label: "Processor", icon: "chip" },
  { id: "ram", label: "Memory", icon: "save" },
  { id: "storage", label: "Storage", icon: "disc" },
  { id: "board", label: "Motherboard", icon: "code" },
  { id: "psu", label: "Power supply", icon: "battery" },
  { id: "case", label: "Case / cooler", icon: "box" },
  { id: "pc", label: "Whole PC", icon: "desktop" },
  { id: "laptop", label: "Laptop", icon: "laptop" },
  { id: "console", label: "Console / other", icon: "gamepad" },
] as const;

export type PartType = (typeof partTypes)[number]["id"];
export interface PriceItem { type: PartType; group: string; name: string; sold: number }

const g = (type: PartType, group: string, rows: [string, number][]): PriceItem[] =>
  rows.map(([name, sold]) => ({ type, group, name, sold }));

export const priceList: PriceItem[] = [
  // ─── Graphics cards ───
  ...g("gpu", "NVIDIA RTX 50 series", [
    ["RTX 5090", 2100], ["RTX 5080", 950], ["RTX 5070 Ti", 680], ["RTX 5070", 480], ["RTX 5060 Ti 16GB", 380], ["RTX 5060 Ti 8GB", 320], ["RTX 5060", 260],
  ]),
  ...g("gpu", "NVIDIA RTX 40 series", [
    ["RTX 4090", 1600], ["RTX 4080 Super", 850], ["RTX 4080", 800], ["RTX 4070 Ti Super", 620], ["RTX 4070 Ti", 560], ["RTX 4070 Super", 500],
    ["RTX 4070", 420], ["RTX 4060 Ti 16GB", 330], ["RTX 4060 Ti 8GB", 280], ["RTX 4060", 230],
  ]),
  ...g("gpu", "NVIDIA RTX 30 series", [
    ["RTX 3090 Ti", 750], ["RTX 3090", 650], ["RTX 3080 Ti", 450], ["RTX 3080 12GB", 400], ["RTX 3080 10GB", 360], ["RTX 3070 Ti", 280], ["RTX 3070", 250],
    ["RTX 3060 Ti", 210], ["RTX 3060 12GB", 190], ["RTX 3060 8GB", 160], ["RTX 3050", 130],
  ]),
  ...g("gpu", "NVIDIA RTX 20 / GTX 16 series", [
    ["RTX 2080 Ti", 280], ["RTX 2080 Super", 220], ["RTX 2080", 200], ["RTX 2070 Super", 180], ["RTX 2070", 160], ["RTX 2060 Super", 150], ["RTX 2060", 125],
    ["GTX 1660 Ti", 110], ["GTX 1660 Super", 105], ["GTX 1660", 95], ["GTX 1650 Super", 85], ["GTX 1650", 75],
  ]),
  ...g("gpu", "NVIDIA GTX 10 series and older", [
    ["GTX 1080 Ti", 150], ["GTX 1080", 110], ["GTX 1070 Ti", 100], ["GTX 1070", 85], ["GTX 1060 6GB", 60], ["GTX 1060 3GB", 45], ["GTX 1050 Ti", 50], ["GTX 1050", 40],
    ["GTX 970 / 980", 40], ["GT 1030 / 730 / 710", 25],
  ]),
  ...g("gpu", "AMD Radeon RX 9000 / 7000", [
    ["RX 9070 XT", 620], ["RX 9070", 520], ["RX 9060 XT 16GB", 330], ["RX 9060 XT 8GB", 270],
    ["RX 7900 XTX", 750], ["RX 7900 XT", 580], ["RX 7900 GRE", 480], ["RX 7800 XT", 420], ["RX 7700 XT", 330], ["RX 7600 XT", 260], ["RX 7600", 210],
  ]),
  ...g("gpu", "AMD Radeon RX 6000", [
    ["RX 6950 XT", 440], ["RX 6900 XT", 400], ["RX 6800 XT", 370], ["RX 6800", 320], ["RX 6750 XT", 270], ["RX 6700 XT", 240], ["RX 6700", 220],
    ["RX 6650 XT", 190], ["RX 6600 XT", 175], ["RX 6600", 155], ["RX 6500 XT", 95], ["RX 6400", 80],
  ]),
  ...g("gpu", "AMD Radeon RX 5000 and older", [
    ["RX 5700 XT", 150], ["RX 5700", 135], ["RX 5600 XT", 110], ["RX 5500 XT", 80], ["RX 590 / 580 8GB", 60], ["RX 570 / 480 / 470", 45], ["Vega 56 / 64", 70],
  ]),
  ...g("gpu", "Intel Arc", [
    ["Arc B580", 230], ["Arc B570", 190], ["Arc A770 16GB", 190], ["Arc A750", 150], ["Arc A580", 120], ["Arc A380", 80],
  ]),

  // ─── Processors ───
  ...g("cpu", "AMD Ryzen 9000 (AM5)", [
    ["Ryzen 7 9800X3D", 430], ["Ryzen 9 9950X", 480], ["Ryzen 9 9900X", 330], ["Ryzen 7 9700X", 250], ["Ryzen 5 9600X", 180],
  ]),
  ...g("cpu", "AMD Ryzen 7000 (AM5)", [
    ["Ryzen 9 7950X3D", 470], ["Ryzen 9 7950X", 400], ["Ryzen 9 7900X", 280], ["Ryzen 7 7800X3D", 340], ["Ryzen 7 7700X", 210], ["Ryzen 7 7700", 200],
    ["Ryzen 5 7600X", 150], ["Ryzen 5 7600", 140], ["Ryzen 5 8600G / 8500G", 130],
  ]),
  ...g("cpu", "AMD Ryzen 5000 (AM4)", [
    ["Ryzen 7 5800X3D", 260], ["Ryzen 7 5700X3D", 200], ["Ryzen 9 5950X", 260], ["Ryzen 9 5900X", 200], ["Ryzen 7 5800X", 140], ["Ryzen 7 5700X", 120],
    ["Ryzen 7 5700G", 120], ["Ryzen 5 5600X", 95], ["Ryzen 5 5600", 85], ["Ryzen 5 5600G", 85], ["Ryzen 5 5500", 65],
  ]),
  ...g("cpu", "AMD Ryzen 3000 and older (AM4)", [
    ["Ryzen 9 3900X", 120], ["Ryzen 7 3700X / 3800X", 85], ["Ryzen 5 3600 / 3600X", 55], ["Ryzen 5 2600 / 2600X", 35], ["Ryzen 7 2700X", 50], ["Ryzen 5 1600", 25], ["Ryzen 3 (any)", 25],
  ]),
  ...g("cpu", "Intel Core Ultra 200 (LGA 1851)", [
    ["Core Ultra 9 285K", 450], ["Core Ultra 7 265K", 280], ["Core Ultra 5 245K", 200],
  ]),
  ...g("cpu", "Intel 12th to 14th gen (LGA 1700)", [
    ["Core i9-14900K", 380], ["Core i7-14700K", 280], ["Core i5-14600K", 190], ["Core i5-14400F", 130],
    ["Core i9-13900K", 320], ["Core i7-13700K", 240], ["Core i5-13600K", 170], ["Core i5-13400F", 110],
    ["Core i9-12900K", 210], ["Core i7-12700K", 160], ["Core i5-12600K", 120], ["Core i5-12400F", 85], ["Core i3-12100F", 55],
  ]),
  ...g("cpu", "Intel 10th / 11th gen (LGA 1200)", [
    ["Core i9-11900K", 130], ["Core i7-11700K", 110], ["Core i5-11600K", 85], ["Core i5-11400F", 65],
    ["Core i9-10900K", 140], ["Core i7-10700K", 110], ["Core i5-10600K", 75], ["Core i5-10400F", 55], ["Core i3-10100F", 35],
  ]),
  ...g("cpu", "Intel 6th to 9th gen (LGA 1151)", [
    ["Core i9-9900K", 120], ["Core i7-9700K", 90], ["Core i5-9600K", 60], ["Core i5-9400F", 45], ["Core i7-8700K", 75], ["Core i5-8400 / 8600K", 40],
    ["Core i7-7700K / 6700K", 50], ["Core i5-7600K / 6600K", 30], ["Older Intel (i3 / Pentium)", 15],
  ]),

  // ─── Memory ───
  ...g("ram", "DDR5", [
    ["64GB DDR5 (2x32)", 170], ["32GB DDR5 (2x16) 6000+", 100], ["32GB DDR5 (2x16) under 6000", 85], ["16GB DDR5 (2x8)", 45],
  ]),
  ...g("ram", "DDR4", [
    ["64GB DDR4 (2x32 or 4x16)", 95], ["32GB DDR4 (2x16) 3600", 55], ["32GB DDR4 (2x16) 3200", 50], ["16GB DDR4 (2x8) 3200+", 28], ["16GB DDR4 (2x8) 2666 or slower", 20], ["8GB DDR4 (single stick)", 10],
  ]),
  ...g("ram", "Laptop memory / older", [
    ["32GB laptop DDR5 (SO-DIMM)", 70], ["16GB laptop DDR4 (SO-DIMM)", 22], ["16GB DDR3 (any)", 10],
  ]),

  // ─── Storage ───
  ...g("storage", "NVMe SSD", [
    ["4TB NVMe Gen4", 230], ["2TB NVMe Gen4", 120], ["2TB NVMe Gen3", 90], ["1TB NVMe Gen4", 65], ["1TB NVMe Gen3", 45], ["512GB NVMe", 25], ["256GB NVMe", 12],
  ]),
  ...g("storage", "SATA SSD / hard drive", [
    ["2TB SATA SSD", 85], ["1TB SATA SSD", 45], ["500GB SATA SSD", 22], ["4TB hard drive", 45], ["2TB hard drive", 25], ["1TB hard drive", 12],
  ]),

  // ─── Motherboards ───
  ...g("board", "AMD AM5", [
    ["X870E / X670E", 220], ["X870 / X670", 170], ["B850 / B650E", 140], ["B650", 115], ["A620", 75],
  ]),
  ...g("board", "AMD AM4", [
    ["X570", 110], ["B550", 75], ["X470 / B450", 50], ["A520 / A320", 35],
  ]),
  ...g("board", "Intel", [
    ["Z890", 200], ["B860", 120], ["Z790", 160], ["B760", 95], ["Z690", 120], ["B660 / H610", 70], ["Z590 / Z490", 80], ["B560 / B460 / H510", 50], ["Z390 / Z370", 60], ["B360 / H310 and older", 30],
  ]),

  // ─── Power supplies ───
  ...g("psu", "Power supply (good brand: Corsair, EVGA, Seasonic, MSI…)", [
    ["1000W+ Gold or better", 120], ["850W Gold", 85], ["750W Gold", 65], ["650W Gold", 50], ["650 to 750W Bronze", 35], ["550W or less", 20],
  ]),
  ...g("psu", "Power supply (no-name or very old)", [
    ["Any wattage, no-name brand", 10],
  ]),

  // ─── Cases and coolers ───
  ...g("case", "Cases", [
    ["High-end case (Lian Li O11, Hyte Y60 / Y70, Fractal North…)", 110], ["Mid-range glass case with fans", 55], ["Basic case", 25], ["Small form factor / ITX case", 70],
  ]),
  ...g("case", "Coolers and fans", [
    ["360mm liquid cooler (AIO)", 75], ["240 / 280mm liquid cooler (AIO)", 50], ["Big air cooler (Noctua, Thermalright Peerless…)", 35], ["Basic air cooler", 12], ["RGB fan pack (3 fans)", 25],
  ]),

  // ─── Whole PCs ───
  ...g("pc", "Gaming PCs (go by the graphics card)", [
    ["RTX 4080 / 4090 / 5080 / 7900 XTX class", 1500], ["RTX 4070 Ti / 5070 Ti / 7900 XT class", 1050], ["RTX 4070 / 5070 / 7800 XT class", 850],
    ["RTX 4060 Ti / 3070 / 6700 XT class", 600], ["RTX 3060 / 4060 / 6600 class", 480], ["GTX 1660 / RX 580 class", 280], ["GTX 1050 / 1060 class or older", 170],
  ]),
  ...g("pc", "Other desktops", [
    ["Office / school desktop (i5 or Ryzen 5, 6th gen+)", 110], ["Office / school desktop, older", 45], ["Mac mini / iMac (2018+)", 300],
  ]),

  // ─── Laptops ───
  ...g("laptop", "Gaming laptops", [
    ["Gaming laptop, RTX 40 or 50 series", 750], ["Gaming laptop, RTX 3060 / 3070", 480], ["Gaming laptop, RTX 2060 / 3050 / GTX 1660 Ti", 330], ["Gaming laptop, older", 180],
  ]),
  ...g("laptop", "MacBooks", [
    ["MacBook Pro M3 / M4", 1050], ["MacBook Pro M1 / M2", 650], ["MacBook Air M2 / M3 / M4", 550], ["MacBook Air M1", 380], ["Intel MacBook (2017 to 2020)", 170],
  ]),
  ...g("laptop", "Windows laptops", [
    ["Business laptop (Dell Latitude, ThinkPad, HP EliteBook), 11th gen+", 230], ["Business laptop, 8th to 10th gen", 130],
    ["School / everyday laptop (i5 or Ryzen 5)", 160], ["Chromebook", 50], ["Older / budget laptop", 60],
  ]),

  // ─── Consoles and other ───
  ...g("console", "Consoles and handhelds", [
    ["PlayStation 5", 330], ["PlayStation 5 Digital", 280], ["Xbox Series X", 300], ["Xbox Series S", 180], ["Nintendo Switch OLED", 200], ["Nintendo Switch", 150],
    ["Steam Deck OLED", 400], ["Steam Deck LCD", 280], ["ROG Ally / Legion Go", 380], ["PS4 / Xbox One", 90],
  ]),
  ...g("console", "Monitors", [
    ["1440p 144Hz+ gaming monitor", 140], ["1080p 144Hz+ gaming monitor", 75], ["1080p 60Hz monitor", 35], ["4K monitor", 160],
  ]),
];

/** What each condition does to the price. `low`/`high` make the estimate a range. */
export const conditions = [
  { id: "new", label: "Like new", note: "Barely used, no marks", low: 0.95, high: 1.1 },
  { id: "good", label: "Works fine", note: "Normal wear, runs well", low: 0.85, high: 1.0 },
  { id: "issues", label: "Has issues", note: "Crashes, noisy fan, artifacts", low: 0.4, high: 0.6 },
  { id: "broken", label: "Broken", note: "Doesn't turn on, for parts", low: 0.1, high: 0.25 },
] as const;

export const extras = [
  { id: "box", label: "Original box", bonus: 0.05 },
  { id: "warranty", label: "Still under warranty", bonus: 0.08 },
];
