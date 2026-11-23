/**
 * SHOP LISTINGS. Add your real items to `listings` at the bottom. While a tab has none, it shows a "Get notified" card.
 * `photo` is a file in app/public/photos/ (leave it out to show an icon instead). `status`: available, reserved or sold.
 */
export type ShopTab = "pcs" | "laptops" | "parts";
/** The 3D Prints page's own categories (also managed in the admin Shop tab). */
export type PrintTab = "prints" | "past_prints";
export type Status = "available" | "reserved" | "sold";

export interface Listing {
  tab: ShopTab | PrintTab;
  name: string;
  price: number;
  condition: string;
  status: Status;
  specs: string[];
  photo?: string;
  icon?: string;
  note?: string;
  /** 3D prints: the colors it comes in */
  colors?: string[];
}

export const shopTabs: { id: ShopTab; label: string; icon: string; blurb: string }[] = [
  { id: "pcs", label: "Prebuilt PCs", icon: "desktop", blurb: "Built, tested and stress-tested by me. Ready to plug in." },
  { id: "laptops", label: "Refurbished laptops", icon: "laptop", blurb: "Cleaned, repaired, fresh Windows install, new thermal paste." },
  { id: "parts", label: "Parts", icon: "chip", blurb: "Tested used parts from trade-ins. Cheaper than new, checked by hand." },
];

/** Extra categories for the 3D Prints page, shown in the admin Shop tab after the Shop's own. */
export const printTabs: { id: PrintTab; label: string; icon: string; blurb: string }[] = [
  { id: "prints", label: "Print Shop", icon: "printer", blurb: "Ready-made 3D prints for your setup, printed to order." },
  { id: "past_prints", label: "Past prints", icon: "box", blurb: "The \"Prints I've made\" gallery on the 3D Prints page." },
];

/* Example:
  { tab: "pcs", name: "The Frost", price: 949, condition: "New build", status: "available", photo: "build-white-radeon.jpg", note: "1440p gaming",
    specs: ["Ryzen 5 7600", "Radeon RX 7700 XT", "32GB DDR5", "1TB NVMe"] },
*/
export const listings: Listing[] = [];
