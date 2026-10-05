import type { FormValues, Option } from "../../types";

export type FieldKind = "choice" | "select" | "pills" | "text" | "email" | "tel" | "textarea" | "windows";

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  placeholder?: string;
  options?: Option[];
  required?: boolean;
  /** Custom error message when required and empty */
  requiredMessage?: string;
  minLength?: number;
  /** Starting value for select fields */
  defaultValue?: string;
}

export interface StepDef {
  title: string;
  sub?: string;
  fields: FieldDef[];
}

export interface FormConfig {
  /** Used in the success message and the email subject, e.g. "Repair" */
  label: string;
  steps: StepDef[];
  /** Short heading above the review step */
  reviewTitle?: string;
}

export type Errors = Record<string, string>;
export type { FormValues };
