import { Paperclip } from "lucide-react";
import type { PublicBranding, PublicFormField } from "../types";

export type FieldValue = string | boolean | string[];
export type Answers = Record<string, FieldValue>;

export function fmtRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "soon";
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "less than a day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function fieldValueMatches(actual: FieldValue | undefined, expected: string): boolean {
  if (actual === undefined) return false;
  if (Array.isArray(actual)) return actual.includes(expected);
  if (typeof actual === "boolean") return actual === (expected.toLowerCase() === "true");
  return actual === expected;
}

export function isFieldVisible(field: PublicFormField, values: Answers): boolean {
  if (!field.conditionalFieldId) return true;
  return fieldValueMatches(values[field.conditionalFieldId], field.conditionalValue);
}

export function validateFormPage(fields: PublicFormField[], values: Answers, pageNum: number): string | null {
  const pageFields = fields.filter((f) => f.page === pageNum && isFieldVisible(f, values));
  for (const f of pageFields) {
    if (!f.required || f.type === "content") continue;
    const v = values[f.id];
    const empty =
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      (f.type === "checkbox" && v !== true);
    if (empty) return `Please fill out "${f.label}" before continuing.`;
  }
  return null;
}

export function PublicFieldInput({ field, value, onChange }: { field: PublicFormField; value: FieldValue | undefined; onChange: (v: FieldValue) => void }) {
  const label = (
    <label className="block text-sm font-medium text-gray-800 mb-1.5">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </label>
  );
  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400";

  switch (field.type) {
    case "textarea":
      return <div>{label}<textarea rows={3} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={`${inputCls} resize-none`} /></div>;
    case "checkbox":
      return (
        <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={(value as boolean) ?? false} onChange={e => onChange(e.target.checked)} />
          <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
        </label>
      );
    case "select_boxes": {
      const selected = (value as string[]) ?? [];
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={e => onChange(e.target.checked ? [...selected, opt] : selected.filter(o => o !== opt))} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "radio":
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name={field.id} checked={value === opt} onChange={() => onChange(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    case "dropdown":
      return (
        <div>
          {label}
          <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    case "signature":
      return (
        <div>
          {label}
          <input
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder="Type your full name to sign"
            className={`${inputCls} italic font-serif`}
          />
        </div>
      );
    case "file":
      return (
        <div>
          {label}
          <label className="flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            <Paperclip size={14} />
            {(value as string) || "Choose file to attach"}
            <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0]?.name ?? "")} />
          </label>
        </div>
      );
    case "payment":
      return (
        <div>
          {label}
          <div className="border border-gray-200 rounded-lg px-3.5 py-3 text-xs text-gray-500 bg-gray-50">
            Payment details are collected securely at checkout.
          </div>
        </div>
      );
    case "date_entry":
      return <div>{label}<input type="date" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "address":
      return <div>{label}<input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} placeholder="Start typing an address…" className={inputCls} /></div>;
    case "date":
      return <div>{label}<input type="date" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "email":
      return <div>{label}<input type="email" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "number":
      return <div>{label}<input type="number" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "phone":
      return <div>{label}<input type="tel" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "insurance":
      return <div>{label}<input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} placeholder="Insurance provider / member ID" className={inputCls} /></div>;
    case "content":
      return <p className="text-sm text-gray-700 whitespace-pre-wrap">{field.label}</p>;
    default:
      return <div>{label}<input type="text" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
  }
}

export function BrandedShell({ branding, children }: { branding: PublicBranding | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {branding && (
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            {branding.practiceLogoUrl ? (
              <img src={branding.practiceLogoUrl} alt={branding.practiceName} className="h-9 w-9 object-contain flex-shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {branding.practiceName.slice(0, 1) || "P"}
              </div>
            )}
            <div className="h-8 w-px bg-gray-200 flex-shrink-0" />
            <p className="text-sm font-bold text-gray-900 leading-tight">{branding.practiceName}</p>
          </div>
        )}
        <div className={branding ? "border-t border-gray-100" : ""} />
        <div className="px-6 py-6">{children}</div>
        {branding && (branding.locationName || branding.locationAddress || branding.locationPhone) && (
          <div className="border-t border-gray-100 px-6 py-5 text-center space-y-2">
            <div className="text-xs text-gray-500">
              {branding.locationName && <p className="font-semibold text-gray-700">{branding.locationName}</p>}
              {branding.locationAddress && <p>{branding.locationAddress}</p>}
              {branding.locationPhone && <p>{branding.locationPhone}</p>}
            </div>
            <p className="text-[11px] text-gray-400">Secure scheduling by nexhealth</p>
          </div>
        )}
      </div>
    </div>
  );
}
