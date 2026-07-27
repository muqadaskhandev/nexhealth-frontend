import { useState } from "react";
import { Paperclip, Plus, X } from "lucide-react";
import type { MedicalAlertCatalog, MedicalAlertCategory, PublicBranding, PublicFormField } from "../types";

export type MedicalAlertsValue = Partial<
  Record<MedicalAlertCategory, { responses: Record<string, "yes" | "no">; writeIns: string[] }>
>;

export type FieldValue = string | boolean | string[] | MedicalAlertsValue;
export type Answers = Record<string, FieldValue>;

const CATEGORY_LABELS: Record<MedicalAlertCategory, string> = {
  condition: "Medical Conditions",
  allergy: "Allergies",
  medication: "Medications",
};

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
  if (typeof actual === "object") return false;
  return actual === expected;
}

export function isFieldVisible(field: PublicFormField, values: Answers): boolean {
  if (!field.conditionalFieldId) return true;
  return fieldValueMatches(values[field.conditionalFieldId], field.conditionalValue);
}

function isMedicalAlertsComplete(value: MedicalAlertsValue | undefined, medicalAlerts: MedicalAlertCatalog | null | undefined): boolean {
  if (!medicalAlerts) return true;
  for (const category of Object.keys(medicalAlerts) as MedicalAlertCategory[]) {
    const alerts = medicalAlerts[category] ?? [];
    const responses = value?.[category]?.responses ?? {};
    for (const alert of alerts) {
      if (responses[alert.id] !== "yes" && responses[alert.id] !== "no") return false;
    }
  }
  return true;
}

export function validateFormPage(
  fields: PublicFormField[],
  values: Answers,
  pageNum: number,
  medicalAlerts?: MedicalAlertCatalog | null
): string | null {
  const pageFields = fields.filter((f) => f.page === pageNum && isFieldVisible(f, values));
  for (const f of pageFields) {
    if (!f.required || f.type === "content") continue;
    const v = values[f.id];
    if (f.type === "medical_alerts_radio") {
      if (!isMedicalAlertsComplete(v as MedicalAlertsValue | undefined, medicalAlerts)) {
        return `Please answer Yes or No for every item under "${f.label}", or use "Set unanswered questions to 'No'".`;
      }
      continue;
    }
    const empty =
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      (f.type === "checkbox" && v !== true);
    if (empty) return `Please fill out "${f.label}" before continuing.`;
  }
  return null;
}

function MedicalAlertsDropdownInput({
  field,
  value,
  medicalAlerts,
  onChange,
}: {
  field: PublicFormField;
  value: MedicalAlertsValue | undefined;
  medicalAlerts: MedicalAlertCatalog | null;
  onChange: (v: MedicalAlertsValue) => void;
}) {
  const [search, setSearch] = useState<Partial<Record<MedicalAlertCategory, string>>>({});
  const [writeInDraft, setWriteInDraft] = useState<Partial<Record<MedicalAlertCategory, string>>>({});
  const categories = (Object.keys(medicalAlerts ?? {}) as MedicalAlertCategory[]).filter(
    (c) => (medicalAlerts?.[c]?.length ?? 0) > 0
  );

  function setCategory(category: MedicalAlertCategory, patch: { responses?: Record<string, "yes" | "no">; writeIns?: string[] }) {
    const current = value?.[category] ?? { responses: {}, writeIns: [] };
    onChange({ ...value, [category]: { ...current, ...patch } });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-2">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <div className="space-y-5">
        {categories.map((category) => {
          const entries = medicalAlerts?.[category] ?? [];
          const current = value?.[category] ?? { responses: {}, writeIns: [] };
          const selectedIds = Object.entries(current.responses).filter(([, v]) => v === "yes").map(([id]) => id);
          const q = (search[category] ?? "").toLowerCase();
          const matches = entries.filter((e) => !selectedIds.includes(e.id) && (q === "" || e.label.toLowerCase().includes(q)));
          return (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{CATEGORY_LABELS[category]}</p>
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedIds.map((id) => {
                    const entry = entries.find((e) => e.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                        {entry?.label ?? id}
                        <button
                          type="button"
                          onClick={() => {
                            const { [id]: _removed, ...rest } = current.responses;
                            setCategory(category, { responses: rest });
                          }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <input
                value={search[category] ?? ""}
                onChange={(e) => setSearch((prev) => ({ ...prev, [category]: e.target.value }))}
                placeholder={`Search and select ${CATEGORY_LABELS[category].toLowerCase()}…`}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 mb-1.5"
              />
              {q && matches.length > 0 && (
                <div className="border border-gray-100 rounded-lg overflow-hidden mb-2 max-h-32 overflow-y-auto">
                  {matches.slice(0, 8).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setCategory(category, { responses: { ...current.responses, [entry.id]: "yes" } });
                        setSearch((prev) => ({ ...prev, [category]: "" }));
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  value={writeInDraft[category] ?? ""}
                  onChange={(e) => setWriteInDraft((prev) => ({ ...prev, [category]: e.target.value }))}
                  placeholder={`Not listed? Write it in…`}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = (writeInDraft[category] ?? "").trim();
                    if (!text) return;
                    setCategory(category, { writeIns: [...current.writeIns, text] });
                    setWriteInDraft((prev) => ({ ...prev, [category]: "" }));
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {current.writeIns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {current.writeIns.map((text, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {text}
                      <button type="button" onClick={() => setCategory(category, { writeIns: current.writeIns.filter((_, idx) => idx !== i) })}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MedicalAlertsRadioInput({
  field,
  value,
  medicalAlerts,
  onChange,
}: {
  field: PublicFormField;
  value: MedicalAlertsValue | undefined;
  medicalAlerts: MedicalAlertCatalog | null;
  onChange: (v: MedicalAlertsValue) => void;
}) {
  const [writeInDraft, setWriteInDraft] = useState<Partial<Record<MedicalAlertCategory, string>>>({});
  const categories = (Object.keys(medicalAlerts ?? {}) as MedicalAlertCategory[]).filter(
    (c) => (medicalAlerts?.[c]?.length ?? 0) > 0
  );

  function setCategory(category: MedicalAlertCategory, patch: { responses?: Record<string, "yes" | "no">; writeIns?: string[] }) {
    const current = value?.[category] ?? { responses: {}, writeIns: [] };
    onChange({ ...value, [category]: { ...current, ...patch } });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-2">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <div className="space-y-6">
        {categories.map((category) => {
          const entries = medicalAlerts?.[category] ?? [];
          const current = value?.[category] ?? { responses: {}, writeIns: [] };
          return (
            <div key={category}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Do you have any of the following {CATEGORY_LABELS[category].toLowerCase()}?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const responses = { ...current.responses };
                    for (const e of entries) if (responses[e.id] === undefined) responses[e.id] = "no";
                    setCategory(category, { responses });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Set unanswered questions to 'No'
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {entries.map((entry) => (
                  <div key={entry.id}>
                    <p className="text-sm text-gray-800 mb-1">
                      {entry.label} <span className="text-red-500">*</span>
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="radio"
                          name={`${field.id}-${entry.id}`}
                          checked={current.responses[entry.id] === "yes"}
                          onChange={() => setCategory(category, { responses: { ...current.responses, [entry.id]: "yes" } })}
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="radio"
                          name={`${field.id}-${entry.id}`}
                          checked={current.responses[entry.id] === "no"}
                          onChange={() => setCategory(category, { responses: { ...current.responses, [entry.id]: "no" } })}
                        />
                        No
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-500 mb-1.5">Add unlisted {CATEGORY_LABELS[category].toLowerCase()} here (one item per entry)</p>
                {current.writeIns.map((text, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1.5">
                    <input
                      value={text}
                      onChange={(e) => setCategory(category, { writeIns: current.writeIns.map((t, idx) => (idx === i ? e.target.value : t)) })}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setCategory(category, { writeIns: current.writeIns.filter((_, idx) => idx !== i) })}
                      className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    value={writeInDraft[category] ?? ""}
                    onChange={(e) => setWriteInDraft((prev) => ({ ...prev, [category]: e.target.value }))}
                    placeholder="Enter the item not listed here"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const text = (writeInDraft[category] ?? "").trim();
                      if (!text) return;
                      setCategory(category, { writeIns: [...current.writeIns, text] });
                      setWriteInDraft((prev) => ({ ...prev, [category]: "" }));
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Plus size={12} /> Add Another
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PublicFieldInput({
  field,
  value,
  medicalAlerts,
  onChange,
}: {
  field: PublicFormField;
  value: FieldValue | undefined;
  medicalAlerts?: MedicalAlertCatalog | null;
  onChange: (v: FieldValue) => void;
}) {
  const label = (
    <label className="block text-sm font-medium text-gray-800 mb-1.5">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </label>
  );
  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400";

  switch (field.type) {
    case "medical_alerts_dropdown":
      return (
        <MedicalAlertsDropdownInput
          field={field}
          value={value as MedicalAlertsValue | undefined}
          medicalAlerts={medicalAlerts ?? null}
          onChange={onChange}
        />
      );
    case "medical_alerts_radio":
      return (
        <MedicalAlertsRadioInput
          field={field}
          value={value as MedicalAlertsValue | undefined}
          medicalAlerts={medicalAlerts ?? null}
          onChange={onChange}
        />
      );
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
