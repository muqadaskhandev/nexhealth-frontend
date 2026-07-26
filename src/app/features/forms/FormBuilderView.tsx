import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Plus, Stethoscope, X, Zap } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { MedicalAlertsModal } from "./MedicalAlertsModal";
import { mapAppointmentType, staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, FormField, FormFieldType, FormTemplate, RulePatientStatus } from "../../types";

const QUESTIONS: { type: FormFieldType; icon: string; label: string }[] = [
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

const LAYOUT: { type: FormFieldType; icon: string; label: string }[] = [
  { type: "content", icon: "¶", label: "Content" },
  { type: "location_logo", icon: "🖼", label: "Location Logo" },
];

const MEDICAL_HISTORY_FIELDS: { type: FormFieldType; icon: string; label: string }[] = [
  { type: "medical_alerts_dropdown", icon: "🩺", label: "Medical Alerts (Dropdown)" },
  { type: "medical_alerts_radio", icon: "🩹", label: "Medical Alerts (Radio)" },
];

const FIELD_LABEL: Record<FormFieldType, string> = Object.fromEntries(
  [...QUESTIONS, ...LAYOUT, ...MEDICAL_HISTORY_FIELDS].map((q) => [q.type, q.label])
) as Record<FormFieldType, string>;

const MEDICAL_ALERTS_TYPES: FormFieldType[] = ["medical_alerts_dropdown", "medical_alerts_radio"];

const OPTIONS_TYPES: FormFieldType[] = ["select_boxes", "dropdown", "radio"];
const VALIDATION_TYPES: FormFieldType[] = ["text", "textarea", "email", "number", "phone"];
const LAYOUT_TYPES: FormFieldType[] = ["content", "location_logo"];

type StarterField = { type: FormFieldType; label: string; required: boolean; options: string[] };
type StarterTemplate = { name: string; documentType: string; fields: StarterField[] };

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: "Patient Information Form",
    documentType: "Medical",
    fields: [
      { type: "text", label: "Full name", required: true, options: [] },
      { type: "date", label: "Date of birth", required: true, options: [] },
      { type: "phone", label: "Phone number", required: true, options: [] },
      { type: "email", label: "Email address", required: false, options: [] },
    ],
  },
  {
    name: "Integrated Medical History Form",
    documentType: "Medical",
    fields: [
      { type: "medical_alerts_radio", label: "Please mark your response to indicate if you have or have had any of the following", required: true, options: [] },
      { type: "textarea", label: "Anything else we should know?", required: false, options: [] },
    ],
  },
  {
    name: "HIPAA Consent",
    documentType: "Consent",
    fields: [
      { type: "textarea", label: "Acknowledgement of Notice of Privacy Practices", required: true, options: [] },
      { type: "signature", label: "Patient signature", required: true, options: [] },
      { type: "date", label: "Date", required: true, options: [] },
    ],
  },
  {
    name: "Insurance Authorization",
    documentType: "Insurance",
    fields: [
      { type: "text", label: "Insurance provider", required: true, options: [] },
      { type: "text", label: "Policy / member ID", required: true, options: [] },
      { type: "signature", label: "Authorization signature", required: true, options: [] },
    ],
  },
  {
    name: "Dental History",
    documentType: "Dental",
    fields: [
      { type: "dropdown", label: "When was your last dental visit?", required: false, options: ["Within 6 months", "6-12 months ago", "1-2 years ago", "More than 2 years ago"] },
      { type: "select_boxes", label: "Do you experience any of the following?", required: false, options: ["Tooth pain", "Sensitivity", "Bleeding gums", "Jaw pain"] },
    ],
  },
  {
    name: "COVID Screening",
    documentType: "Medical",
    fields: [
      { type: "checkbox", label: "I have experienced fever or chills in the past 14 days", required: false, options: [] },
      { type: "checkbox", label: "I have been in contact with someone diagnosed with COVID-19", required: false, options: [] },
      { type: "date", label: "Date completed", required: true, options: [] },
    ],
  },
  {
    name: "Credit Card Authorization Form",
    documentType: "Payment",
    fields: [
      { type: "text", label: "Cardholder name", required: true, options: [] },
      { type: "text", label: "Billing address", required: false, options: [] },
      { type: "payment", label: "Payment method", required: true, options: [] },
      { type: "signature", label: "Authorization signature", required: true, options: [] },
      { type: "date", label: "Date", required: true, options: [] },
    ],
  },
  {
    name: "Stored Payment Methods Agreement",
    documentType: "Payment",
    fields: [
      { type: "content", label: "This form explains how our practice securely stores your payment method on file for future charges.", required: false, options: [] },
      { type: "checkbox", label: "I authorize this practice to store my payment method on file", required: true, options: [] },
      { type: "signature", label: "Patient signature", required: true, options: [] },
      { type: "date", label: "Date", required: true, options: [] },
    ],
  },
];

function makeFieldId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FormBuilderView({
  initial,
  onExit,
  onSaved,
}: {
  initial?: FormTemplate;
  onExit: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.name ?? "New Form Title");
  const [template, setTemplate] = useState("");
  const [documentType, setDocumentType] = useState(initial?.documentType ?? "");
  const [displayType, setDisplayType] = useState<"wizard" | "single_page">(initial?.displayType ?? "wizard");
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? []);
  const [pageCount, setPageCount] = useState(initial?.pageCount ?? 1);
  const [activePage, setActivePage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sendAutomatically, setSendAutomatically] = useState(initial?.sendAutomatically ?? false);
  const [rulePatientStatus, setRulePatientStatus] = useState<RulePatientStatus>(initial?.rulePatientStatus ?? "any");
  const [ruleFrequencyMonths, setRuleFrequencyMonths] = useState<number | null>(initial?.ruleFrequencyMonths ?? null);
  const [ruleMinAge, setRuleMinAge] = useState<number | null>(initial?.ruleMinAge ?? null);
  const [ruleMaxAge, setRuleMaxAge] = useState<number | null>(initial?.ruleMaxAge ?? null);
  const [ruleAppointmentTypeIds, setRuleAppointmentTypeIds] = useState<string[]>(initial?.ruleAppointmentTypeIds ?? []);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [showMedicalAlerts, setShowMedicalAlerts] = useState(false);

  useEffect(() => {
    staffApi.appointmentTypes
      .list()
      .then((rows) => setAppointmentTypes(rows.map(mapAppointmentType)))
      .catch(() => setAppointmentTypes([]));
  }, []);

  function toggleRuleAppointmentType(id: string) {
    setRuleAppointmentTypeIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  function applyTemplate(name: string) {
    setTemplate(name);
    const tpl = STARTER_TEMPLATES.find((t) => t.name === name);
    if (!tpl) return;
    setTitle(tpl.name);
    setDocumentType(tpl.documentType);
    setFields(tpl.fields.map((f) => ({
      ...f, id: makeFieldId(), page: 1,
      minLength: null, maxLength: null, conditionalFieldId: null, conditionalValue: "",
    })));
    setPageCount(1);
    setActivePage(1);
  }

  function addField(type: FormFieldType) {
    const field: FormField = {
      id: makeFieldId(),
      type,
      label: FIELD_LABEL[type],
      required: false,
      options: OPTIONS_TYPES.includes(type) ? ["Option 1"] : [],
      page: activePage,
      minLength: null,
      maxLength: null,
      conditionalFieldId: null,
      conditionalValue: "",
    };
    setFields((prev) => [...prev, field]);
  }

  function duplicateField(id: string) {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const copy: FormField = { ...prev[idx], id: makeFieldId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFields((prev) =>
      prev.filter((f) => f.id !== id).map((f) => (f.conditionalFieldId === id ? { ...f, conditionalFieldId: null, conditionalValue: "" } : f))
    );
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields((prev) => {
      const idxs = prev.map((f, i) => (f.page === activePage ? i : -1)).filter((i) => i !== -1);
      const pos = idxs.findIndex((i) => prev[i].id === id);
      const swapWith = idxs[pos + dir];
      if (swapWith === undefined) return prev;
      const next = [...prev];
      const a = idxs[pos];
      [next[a], next[swapWith]] = [next[swapWith], next[a]];
      return next;
    });
  }

  function addOption(id: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, options: [...f.options, `Option ${f.options.length + 1}`] } : f))
    );
  }

  function updateOption(id: string, index: number, value: string) {
    setFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, options: f.options.map((o, i) => (i === index ? value : o)) } : f
      )
    );
  }

  function removeOption(id: string, index: number) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, options: f.options.filter((_, i) => i !== index) } : f))
    );
  }

  function handleSave() {
    if (submitting) return;
    setError(null);
    if (!title.trim()) {
      setError("Give this form a title.");
      return;
    }
    if (fields.length === 0) {
      setError("Add at least one question before saving.");
      return;
    }
    for (const f of fields) {
      if (!f.label.trim()) {
        setError("Every question needs a label.");
        return;
      }
      if (f.minLength !== null && f.maxLength !== null && f.minLength > f.maxLength) {
        setError(`"${f.label}" has a minimum length greater than its maximum length.`);
        return;
      }
    }
    if (sendAutomatically) {
      if (ruleFrequencyMonths !== null && ruleFrequencyMonths < 1) {
        setError("Frequency must be at least 1 month.");
        return;
      }
      if (ruleMinAge !== null && ruleMaxAge !== null && ruleMinAge > ruleMaxAge) {
        setError("Minimum age can't be greater than maximum age.");
        return;
      }
    }

    setSubmitting(true);
    const body = {
      name: title.trim(),
      form_type: documentType,
      display_type: displayType,
      page_count: pageCount,
      fields: fields.map((f) => ({
        id: f.id, type: f.type, label: f.label.trim(), required: f.required, options: f.options, page: f.page,
        min_length: f.minLength, max_length: f.maxLength,
        conditional_field_id: f.conditionalFieldId, conditional_value: f.conditionalValue,
      })),
      send_automatically: sendAutomatically,
      rule_patient_status: rulePatientStatus,
      rule_frequency_months: sendAutomatically ? ruleFrequencyMonths : null,
      rule_min_age: sendAutomatically ? ruleMinAge : null,
      rule_max_age: sendAutomatically ? ruleMaxAge : null,
      rule_appointment_type_ids: sendAutomatically ? ruleAppointmentTypeIds : [],
    };
    const request = initial
      ? staffApi.forms.updateTemplate(initial.id, body)
      : staffApi.forms.createTemplate(body);
    request
      .then(() => {
        toastSuccess(initial ? "Form updated" : "Form created");
        onSaved();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        const msg = apiErr?.detail || "Could not save this form — please try again.";
        setError(msg);
        toastError(msg);
      })
      .finally(() => setSubmitting(false));
  }

  const activeFields = fields.filter((f) => f.page === activePage);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">Form Builder</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={submitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors">
            {submitting ? "Saving…" : "Save and exit"}
          </button>
          <IconButton label="Close" onClick={onExit} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"><X size={15} /></IconButton>
        </div>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
      )}

      {/* Config row */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border bg-gray-50/50 flex-shrink-0 flex-wrap">
        {!initial && (
          <div className="relative">
            <select value={template} onChange={e => applyTemplate(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[180px] focus:border-teal-400">
              <option value="">Select a Template</option>
              {STARTER_TEMPLATES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        <div className="relative">
          <select value={documentType} onChange={e => setDocumentType(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[150px] focus:border-teal-400">
            <option value="">Document Type</option>
            <option>Medical</option><option>Dental</option><option>Insurance</option><option>Consent</option><option>Payment</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Display Type</span>
          <div className="relative">
            <select value={displayType} onChange={e => setDisplayType(e.target.value as "wizard" | "single_page")} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none focus:border-teal-400">
              <option value="wizard">Wizard</option><option value="single_page">Single Page</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Title</span>
          <input value={title} onChange={e => setTitle(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white min-w-[160px]" />
        </div>
        {fields.some(f => MEDICAL_ALERTS_TYPES.includes(f.type)) && (
          <button
            onClick={() => setShowMedicalAlerts(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700 ml-auto"
          >
            <Stethoscope size={14} /> Manage medical alerts
          </button>
        )}
      </div>

      {/* Automation */}
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-white flex-shrink-0">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer w-fit">
          <input type="checkbox" checked={sendAutomatically} onChange={e => setSendAutomatically(e.target.checked)} className="accent-teal-500" />
          <Zap size={14} className="text-teal-500" />
          Send automatically
        </label>
        {sendAutomatically && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Patient status</label>
              <select
                value={rulePatientStatus}
                onChange={e => setRulePatientStatus(e.target.value as RulePatientStatus)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-teal-400"
              >
                <option value="any">Any</option>
                <option value="new">New patients</option>
                <option value="existing">Existing patients</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frequency (months)</label>
              <input
                type="number"
                min={1}
                value={ruleFrequencyMonths ?? ""}
                onChange={e => setRuleFrequencyMonths(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Every time"
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min age</label>
              <input
                type="number"
                min={0}
                value={ruleMinAge ?? ""}
                onChange={e => setRuleMinAge(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="No minimum"
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max age</label>
              <input
                type="number"
                min={0}
                value={ruleMaxAge ?? ""}
                onChange={e => setRuleMaxAge(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="No maximum"
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Appointment types</label>
              {appointmentTypes.length === 0 ? (
                <p className="text-xs text-gray-400">No appointment types configured — this rule will match any appointment type.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {appointmentTypes.map(at => (
                    <button
                      key={at.id}
                      type="button"
                      onClick={() => toggleRuleAppointmentType(at.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${ruleAppointmentTypeIds.includes(at.id) ? "bg-teal-500 border-teal-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-teal-300"}`}
                    >
                      {at.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
        {/* Questions + Layout sidebar */}
        <div className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r border-border bg-white flex-shrink-0 overflow-x-auto sm:overflow-y-auto sm:max-h-full">
          <div className="flex sm:block">
            <p className="hidden sm:block px-4 py-3 text-sm font-bold text-gray-900 border-b border-border">Questions</p>
            {QUESTIONS.map(q => (
              <button key={q.label} onClick={() => addField(q.type)} className="flex-shrink-0 sm:w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b-0 sm:border-b border-gray-50 last:border-0 whitespace-nowrap">
                <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex sm:block">
            <p className="hidden sm:block px-4 py-3 text-sm font-bold text-gray-900 border-b border-t border-border">Layout</p>
            {LAYOUT.map(q => (
              <button key={q.label} onClick={() => addField(q.type)} className="flex-shrink-0 sm:w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b-0 sm:border-b border-gray-50 last:border-0 whitespace-nowrap">
                <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex sm:block">
            <p className="hidden sm:block px-4 py-3 text-sm font-bold text-gray-900 border-b border-t border-border">Medical History</p>
            {MEDICAL_HISTORY_FIELDS.map(q => (
              <button key={q.label} onClick={() => addField(q.type)} className="flex-shrink-0 sm:w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b-0 sm:border-b border-gray-50 last:border-0 whitespace-nowrap">
                <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 overflow-y-auto">
          {/* Page tabs */}
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-white border-b border-border overflow-x-auto">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md flex-shrink-0 transition-colors ${activePage === page ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-200"}`}
              >
                Page {page}
              </button>
            ))}
            <button onClick={() => { const n = pageCount + 1; setPageCount(n); setActivePage(n); }} className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors px-2 flex-shrink-0">
              <span className="text-base leading-none">+</span> Page
            </button>
          </div>

          {/* Field list for active page */}
          <div className="p-4 sm:p-6">
            <p className="text-sm font-semibold text-gray-600 mb-2">Page {activePage}</p>
            <div className="bg-white rounded-xl border border-border p-4 space-y-3">
              {activeFields.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg px-6 py-10 text-center text-sm text-gray-400">
                  Click a question type on the left to add it to this page
                </div>
              ) : (
                activeFields.map((f, i) => (
                  <div key={f.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 flex-shrink-0 w-24 truncate">{FIELD_LABEL[f.type]}</span>
                      <input
                        value={f.label}
                        onChange={e => updateField(f.id, { label: e.target.value })}
                        placeholder="Question label"
                        className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <IconButton label="Move up" onClick={() => moveField(f.id, -1)} disabled={i === 0} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp size={14} /></IconButton>
                        <IconButton label="Move down" onClick={() => moveField(f.id, 1)} disabled={i === activeFields.length - 1} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown size={14} /></IconButton>
                        <IconButton label="Duplicate question" onClick={() => duplicateField(f.id)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700"><Copy size={13} /></IconButton>
                        <IconButton label="Remove question" onClick={() => removeField(f.id)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600"><X size={14} /></IconButton>
                      </div>
                    </div>

                    {!LAYOUT_TYPES.includes(f.type) && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, { required: e.target.checked })} />
                        Required
                      </label>
                    )}

                    {OPTIONS_TYPES.includes(f.type) && (
                      <div className="pl-1 space-y-1.5">
                        {f.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <input
                              value={opt}
                              onChange={e => updateOption(f.id, oi, e.target.value)}
                              className="flex-1 min-w-0 px-2.5 py-1 border border-gray-200 rounded-md text-xs text-gray-700 outline-none focus:border-teal-400"
                            />
                            <IconButton label="Remove option" onClick={() => removeOption(f.id, oi)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500"><X size={12} /></IconButton>
                          </div>
                        ))}
                        <button onClick={() => addOption(f.id)} className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">
                          <Plus size={12} /> Add option
                        </button>
                      </div>
                    )}

                    {VALIDATION_TYPES.includes(f.type) && (
                      <div className="pl-1 pt-1 border-t border-gray-50">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Validation</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={f.minLength ?? ""}
                            onChange={e => updateField(f.id, { minLength: e.target.value === "" ? null : Number(e.target.value) })}
                            placeholder="Min length"
                            className="w-24 px-2.5 py-1 border border-gray-200 rounded-md text-xs text-gray-700 outline-none focus:border-teal-400"
                          />
                          <input
                            type="number"
                            min={0}
                            value={f.maxLength ?? ""}
                            onChange={e => updateField(f.id, { maxLength: e.target.value === "" ? null : Number(e.target.value) })}
                            placeholder="Max length"
                            className="w-24 px-2.5 py-1 border border-gray-200 rounded-md text-xs text-gray-700 outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>
                    )}

                    {fields.length > 1 && (
                      <div className="pl-1 pt-1 border-t border-gray-50">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Conditional</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={f.conditionalFieldId ?? ""}
                            onChange={e => updateField(f.id, { conditionalFieldId: e.target.value || null, conditionalValue: e.target.value ? f.conditionalValue : "" })}
                            className="px-2.5 py-1 border border-gray-200 rounded-md text-xs text-gray-700 outline-none focus:border-teal-400 bg-white max-w-[180px]"
                          >
                            <option value="">Always show</option>
                            {fields.filter(other => other.id !== f.id).map(other => (
                              <option key={other.id} value={other.id}>Show only if "{other.label || FIELD_LABEL[other.type]}"…</option>
                            ))}
                          </select>
                          {f.conditionalFieldId && (
                            <input
                              value={f.conditionalValue}
                              onChange={e => updateField(f.id, { conditionalValue: e.target.value })}
                              placeholder="…equals this value"
                              className="flex-1 min-w-[120px] px-2.5 py-1 border border-gray-200 rounded-md text-xs text-gray-700 outline-none focus:border-teal-400"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showMedicalAlerts && <MedicalAlertsModal onClose={() => setShowMedicalAlerts(false)} />}
    </div>
  );
}
