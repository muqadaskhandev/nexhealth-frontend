import { useState } from "react";
import { ArrowLeft, ArrowRight, Paperclip, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import type { FormField, FormTemplate } from "../../types";

type FieldValue = string | boolean | string[];
type Values = Record<string, FieldValue>;

const LANGUAGES = ["English", "Spanish", "French", "Mandarin", "Other"];

function FieldPreview({ field, value, onChange }: { field: FormField; value: FieldValue | undefined; onChange: (v: FieldValue) => void }) {
  const label = (
    <label className="block text-sm font-medium text-gray-800 mb-1.5">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </label>
  );
  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400";
  const hint = (field.minLength !== null || field.maxLength !== null) && (
    <p className="text-xs text-gray-400 mt-1">
      {field.minLength !== null && field.maxLength !== null
        ? `${field.minLength}–${field.maxLength} characters`
        : field.minLength !== null
        ? `At least ${field.minLength} characters`
        : `Up to ${field.maxLength} characters`}
    </p>
  );

  switch (field.type) {
    case "textarea":
      return <div>{label}<textarea rows={3} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={`${inputCls} resize-none`} />{hint}</div>;
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
          <input type="checkbox" checked={(value as boolean) ?? false} onChange={e => onChange(e.target.checked)} />
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
      );
    case "select_boxes": {
      const selected = (value as string[]) ?? [];
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.length === 0 ? (
              <p className="text-xs text-gray-400">No options added</p>
            ) : field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={e => onChange(e.target.checked ? [...selected, opt] : selected.filter(o => o !== opt))}
                />
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
            {field.options.length === 0 ? (
              <p className="text-xs text-gray-400">No options added</p>
            ) : field.options.map((opt, i) => (
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
    case "preferred_language":
      return (
        <div>
          {label}
          <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      );
    case "signature":
      return (
        <div>
          {label}
          <div className="border border-dashed border-gray-300 rounded-lg h-16 flex items-center justify-center text-xs text-gray-400 bg-gray-50">
            Signature
          </div>
        </div>
      );
    case "file":
      return (
        <div>
          {label}
          <div className="flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 bg-gray-50">
            <Paperclip size={14} /> Choose file to attach
          </div>
        </div>
      );
    case "payment":
      return (
        <div>
          {label}
          <div className="border border-gray-200 rounded-lg px-3.5 py-3 text-xs text-gray-500 bg-gray-50">
            Payment details collected securely at checkout — not shown here in preview.
          </div>
        </div>
      );
    case "date_entry":
      return (
        <div>
          {label}
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Month" className={inputCls} />
            <input placeholder="Day" className={inputCls} />
            <input placeholder="Year" className={inputCls} />
          </div>
        </div>
      );
    case "address":
      return <div>{label}<input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} placeholder="Start typing an address…" className={inputCls} /></div>;
    case "date":
      return <div>{label}<input type="date" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "email":
      return <div>{label}<input type="email" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} />{hint}</div>;
    case "number":
      return <div>{label}<input type="number" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} />{hint}</div>;
    case "phone":
      return <div>{label}<input type="tel" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} />{hint}</div>;
    case "insurance":
      return <div>{label}<input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} placeholder="Insurance provider / member ID" className={inputCls} /></div>;
    default:
      return <div>{label}<input type="text" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} />{hint}</div>;
  }
}

function LayoutPreview({ field }: { field: FormField }) {
  const { activeLocation } = useAuth();
  if (field.type === "location_logo") {
    return activeLocation?.logo_url ? (
      <img src={activeLocation.logo_url} alt={activeLocation.name} className="h-12 object-contain" />
    ) : (
      <div className="h-12 w-32 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
        Location logo
      </div>
    );
  }
  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{field.label}</p>;
}

function fieldValueMatches(actual: FieldValue | undefined, expected: string): boolean {
  if (actual === undefined) return false;
  if (Array.isArray(actual)) return actual.includes(expected);
  if (typeof actual === "boolean") return actual === (expected.toLowerCase() === "true");
  return actual === expected;
}

export function PreviewFormModal({ template, onClose }: { template: FormTemplate; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [values, setValues] = useState<Values>({});
  const isWizard = template.displayType === "wizard" && template.pageCount > 1;
  const pages = isWizard
    ? [page]
    : Array.from({ length: template.pageCount }, (_, i) => i + 1);

  function setValue(id: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function isVisible(field: FormField): boolean {
    if (!field.conditionalFieldId) return true;
    return fieldValueMatches(values[field.conditionalFieldId], field.conditionalValue);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{template.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Preview — this is what a patient would see</p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-5">
          {template.status === "digitizing" ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
              This form is still being converted by our team — no preview available yet.
            </p>
          ) : template.fields.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-6 text-center">
              This form doesn't have any questions yet.
            </p>
          ) : (
            pages.map((p) => (
              <div key={p} className="space-y-4">
                {template.pageCount > 1 && !isWizard && (
                  <p className="text-xs font-semibold text-gray-500 pt-2 first:pt-0">Page {p}</p>
                )}
                {template.fields.filter((f) => f.page === p && isVisible(f)).map((f) => (
                  f.type === "content" || f.type === "location_logo" ? (
                    <LayoutPreview key={f.id} field={f} />
                  ) : (
                    <FieldPreview key={f.id} field={f} value={values[f.id]} onChange={(v) => setValue(f.id, v)} />
                  )
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {isWizard && template.status !== "digitizing" && template.fields.length > 0 && (
            <div className="flex items-center gap-2 mr-auto">
              <IconButton label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeft size={14} />
              </IconButton>
              <span className="text-xs text-gray-500">Page {page} of {template.pageCount}</span>
              <IconButton label="Next page" onClick={() => setPage((p) => Math.min(template.pageCount, p + 1))} disabled={page === template.pageCount} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowRight size={14} />
              </IconButton>
            </div>
          )}
          <button onClick={onClose} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors ml-auto">
            Exit preview
          </button>
        </div>
      </div>
    </div>
  );
}
