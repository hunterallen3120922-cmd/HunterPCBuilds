import type { ComponentType } from "react";
import type { FormValues, Option } from "../../types";

export type FieldKind = "cards" | "choice" | "select" | "pills" | "text" | "email" | "tel" | "textarea" | "windows" | "static";
// "cards" = big picture cards (one answer, or several with `multi`)
// "static" shows a fixed value (defaultValue) that the customer can't edit, e.g. the chosen service

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
  /** "cards": allow picking more than one */
  multi?: boolean;
  /** Starting value for select fields */
  defaultValue?: string;
}

export interface StepDef {
  /** Small label above the title, e.g. "Part 1 of 6" */
  eyebrow?: string;
  title: string;
  sub?: string;
  fields: FieldDef[];
  /** Text on the Next button for this step, e.g. "Install case" */
  next?: string;
}

export interface FormConfig {
  /** Used in the success message and the email subject, e.g. "Repair" */
  label: string;
  steps: StepDef[];
  /** Short heading above the review step */
  reviewTitle?: string;
  /** Shown beside the steps the whole way through (the build form's PC workbench) */
  aside?: ComponentType<{ values: FormValues; step: number }>;
}

export type Errors = Record<string, string>;
export type { FormValues };
