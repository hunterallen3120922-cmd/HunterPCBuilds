/**
 * SHOP LISTINGS (sketch, sample items). Later these would come from the admin portal, so selling one there
 * marks it Sold here and counts toward your profit.
 */
export type ShopTab = "pcs" | "laptops" | "parts";
export type Status = "available" | "reserved" | "sold";

export interface Listing {
  tab: ShopTab;
  name: string;
  price: number;
  condition: string;
  status: Status;
  specs: string[];
  photo?: string;
  icon?: string;
  note?: string;
}

export const shopTabs: { id: ShopTab; label: string; icon: string; blurb: string }[] = [
  { id: "pcs", label: "Prebuilt PCs", icon: "desktop", blurb: "Built, tested and stress-tested by me. Ready to plug in." },
  { id: "laptops", label: "Refurbished laptops", icon: "laptop", blurb: "Cleaned, repaired, fresh Windows install, new thermal paste." },
  { id: "parts", label: "Parts", icon: "chip", blurb: "Tested used parts from trade-ins. Cheaper than new, checked by hand." },
];

export const listings: Listing[] = [
  { tab: "pcs", name: "The Frost", price: 949, condition: "New build", status: "available", photo: "build-white-radeon.jpg", note: "1440p gaming",
    specs: ["Ryzen 5 7600", "Radeon RX 7700 XT", "32GB DDR5", "1TB NVMe"] },
  { tab: "pcs", name: "Blue Shift", price: 799, condition: "New build", status: "reserved", photo: "build-blue-evga-rtx.jpg", note: "1080p high",
    specs: ["Core i5-12400F", "RTX 3060 Ti", "16GB DDR4", "1TB NVMe"] },
  { tab: "pcs", name: "Rainbow Cube", price: 549, condition: "Refurbished", status: "available", photo: "build-rgb-cube-gtx1660.jpg", note: "Esports, school",
    specs: ["Ryzen 5 3600", "GTX 1660 Super", "16GB DDR4", "500GB SSD"] },
  { tab: "pcs", name: "Red Zalman", price: 629, condition: "Refurbished", status: "sold", photo: "build-red-zalman.jpg", note: "1080p gaming",
    specs: ["Core i5-10400F", "RTX 2060", "16GB DDR4", "1TB SSD"] },
  { tab: "laptops", name: "Dell Latitude 7420", price: 279, condition: "Refurbished · A grade", status: "available", icon: "laptop", note: "School / work",
    specs: ["Core i5 11th gen", "16GB RAM", "256GB SSD", "New battery"] },
  { tab: "laptops", name: "ASUS TUF A15", price: 549, condition: "Refurbished · B grade", status: "available", icon: "laptop", note: "Gaming",
    specs: ["Ryzen 7 5800H", "RTX 3060 laptop", "16GB RAM", "Screen replaced"] },
  { tab: "laptops", name: "HP Pavilion 15", price: 189, condition: "Refurbished · B grade", status: "reserved", icon: "laptop", note: "Everyday",
    specs: ["Ryzen 5 5500U", "8GB RAM", "512GB SSD", "New keyboard"] },
  { tab: "parts", name: "RTX 3070 Founders", price: 259, condition: "Used · tested", status: "available", icon: "monitor",
    specs: ["8GB GDDR6", "3 hr stress test passed", "Repasted"] },
  { tab: "parts", name: "Ryzen 5 5600X", price: 99, condition: "Used · tested", status: "available", icon: "chip",
    specs: ["6 cores / 12 threads", "AM4", "Stock cooler included"] },
  { tab: "parts", name: "16GB DDR4 3200 kit", price: 35, condition: "Used · tested", status: "available", icon: "save",
    specs: ["2 x 8GB", "MemTest passed"] },
  { tab: "parts", name: "1TB NVMe SSD", price: 49, condition: "Used · 97% health", status: "sold", icon: "disc",
    specs: ["PCIe 3.0", "Wiped and health checked"] },
];
