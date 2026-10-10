export interface RepairService {
  name: string;
  description: string;
  /** Shown big on the card, e.g. "$40" or "Free" */
  price: string;
  /** true adds a "+ parts" label next to the price */
  plusParts?: boolean;
  /** true = also shown in the home page carousel */
  featured?: boolean;
  /** An icon name, e.g. "shield" (list in app/src/components/Icon.tsx) */
  icon: string;
}

export interface BuildTier {
  name: string;
  budget: string;
  bestFor: string;
  /** Shown when the card is clicked */
  description: string;
  /** Shown on the card and in its details, and filled into the request when you press "Build now" */
  recommendedSpecs: string[];
  laborPrice: string;
  /** true = the details show the budget slider and part picker (content/customParts.ts) instead of fixed specs */
  builder?: boolean;
}

export interface GalleryItem {
  title: string;
  /** File name inside public/gallery/ (or a full web address, for builds from the admin portal) */
  photo: string;
  /** All photos (full web addresses), when a build has more than one */
  photos?: string[];
  specs: string[];
  /** Optional */
  price?: string;
  /** true = also shown in the highlight strip on the home page */
  featured?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
  /** true = also shown in the FAQ preview on the home page */
  preview?: boolean;
}

export interface Option {
  value: string;
  label?: string;
  description?: string;
  icon?: string;
}

export interface PreferredWindow {
  date: string; // YYYY-MM-DD
  time: string; // e.g. "15:00"
}

export type FieldValue = string | string[] | PreferredWindow[];
export type FormValues = Record<string, FieldValue>;
