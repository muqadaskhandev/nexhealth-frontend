import type { FormFieldType } from "../../types";

export const FIELD_LABEL: Record<FormFieldType, string> = {
  text: "Text Field",
  textarea: "Text Area",
  email: "Email",
  number: "Number",
  phone: "Phone Number",
  checkbox: "Checkbox",
  select_boxes: "Select Boxes",
  dropdown: "Dropdown",
  radio: "Radio",
  date: "Date",
  date_entry: "Date Entry",
  address: "Address",
  file: "File",
  signature: "Signature",
  insurance: "Insurance",
  preferred_language: "Preferred Language",
  payment: "Payment Method",
  content: "Content",
  location_logo: "Location Logo",
  columns: "Columns",
  panel: "Panel",
  medical_alerts_dropdown: "Medical Alerts (Dropdown)",
  medical_alerts_radio: "Medical Alerts (Radio)",
};

export const QUESTIONS: { type: FormFieldType; icon: string; label: string }[] = [
  { type: "text", icon: ">_", label: "Text Field" },
  { type: "textarea", icon: "A", label: "Text Area" },
  { type: "email", icon: "@", label: "Email" },
  { type: "number", icon: "#", label: "Number" },
  { type: "phone", icon: "☎", label: "Phone Number" },
  { type: "checkbox", icon: "☑", label: "Checkbox" },
  { type: "select_boxes", icon: "⊞", label: "Select Boxes" },
  { type: "dropdown", icon: "▾", label: "Dropdown" },
  { type: "radio", icon: "◉", label: "Radio" },
  { type: "date", icon: "📅", label: "Date" },
  { type: "date_entry", icon: "📆", label: "Date Entry" },
  { type: "address", icon: "📍", label: "Address" },
  { type: "file", icon: "📎", label: "File" },
  { type: "signature", icon: "✎", label: "Signature" },
  { type: "insurance", icon: "🛡", label: "Insurance" },
  { type: "preferred_language", icon: "🌐", label: "Preferred Language" },
  { type: "payment", icon: "💳", label: "Payment Method" },
];

export const LAYOUT: { type: FormFieldType; icon: string; label: string }[] = [
  { type: "content", icon: "¶", label: "Content" },
  { type: "columns", icon: "▥", label: "Columns" },
  { type: "panel", icon: "▢", label: "Panel" },
  { type: "location_logo", icon: "🖼", label: "Location Logo" },
];

export const MEDICAL_HISTORY_FIELDS: { type: FormFieldType; icon: string; label: string }[] = [
  { type: "medical_alerts_dropdown", icon: "🩺", label: "Medical Alerts (Dropdown)" },
  { type: "medical_alerts_radio", icon: "🩹", label: "Medical Alerts (Radio)" },
];

export const OPTIONS_TYPES: FormFieldType[] = ["select_boxes", "dropdown", "radio"];
export const VALIDATION_TYPES: FormFieldType[] = ["text", "textarea", "email", "number", "phone"];
export const LAYOUT_TYPES: FormFieldType[] = ["content", "location_logo", "columns", "panel"];
export const MEDICAL_ALERTS_TYPES: FormFieldType[] = ["medical_alerts_dropdown", "medical_alerts_radio"];

export const SYNC_TARGETS: { value: string; label: string }[] = [
  { value: "", label: "Don't sync to health record" },
  { value: "patient.first_name", label: "Patient first name" },
  { value: "patient.last_name", label: "Patient last name" },
  { value: "patient.email", label: "Email" },
  { value: "patient.phone", label: "Phone number" },
  { value: "patient.date_of_birth", label: "Date of birth" },
  { value: "patient.address", label: "Address" },
  { value: "patient.insurance", label: "Insurance" },
  { value: "patient.preferred_language", label: "Preferred language" },
];

export const DRAG_FIELD_TYPE = "application/x-nex-form-field-type";

export function makeFieldId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
