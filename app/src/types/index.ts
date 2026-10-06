export interface RepairService {
  name: string;
  description: string;
  /** Shown big on the card, e.g. "$40" or "Free" */
  price: string;
  /** true adds a "+ parts" label next to the price */
  plusParts?: boolean;
  /** An icon name, e.g. "shield" (list in app/src/components/Icon.tsx) */
  icon: string;
}

export interface BuildTier {
  name: string;
  budget: string;
  bestFor: string;
  exampleSpecs: string[];
  laborPrice: string;
}

export interface GalleryItem {
  title: string;
  /** File name inside public/gallery/ */
  photo: string;
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
