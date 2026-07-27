import { useEffect, useState } from "react";
import { ChevronDown, Stethoscope, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { FormAutomationRulesPanel } from "./FormAutomationRulesPanel";
import { MedicalAlertsModal } from "./MedicalAlertsModal";
import { FormBuilderFieldCard } from "./FormBuilderFieldCard";
import { FormFieldEditorModal } from "./FormFieldEditorModal";
import {
  DRAG_FIELD_TYPE,
  FIELD_LABEL,
  LAYOUT,
  MEDICAL_ALERTS_TYPES,
  MEDICAL_HISTORY_FIELDS,
  QUESTIONS,
  makeFieldId,
} from "./formBuilderConstants";
import { mapAppointmentType, staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, FormField, FormFieldType, FormTemplate, RulePatientStatus } from "../../types";

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

function newField(type: FormFieldType, page: number): FormField {
  return {
    id: makeFieldId(),
    type,
    label: FIELD_LABEL[type],
    required: false,
    options: ["select_boxes", "dropdown", "radio"].includes(type) ? ["Option 1"] : [],
    page,
    minLength: null,
    maxLength: null,
    conditionalFieldId: null,
    conditionalValue: "",
    labelPosition: "top",
    syncTarget: null,
    placeholder: "",
    defaultValue: "",
    width: "full",
  };
}

function normalizeField(f: FormField): FormField {
  return {
    ...f,
    labelPosition: f.labelPosition ?? "top",
    syncTarget: f.syncTarget ?? null,
    placeholder: f.placeholder ?? "",
    defaultValue: f.defaultValue ?? "",
    width: f.width ?? "full",
  };
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
  const [fields, setFields] = useState<FormField[]>((initial?.fields ?? []).map(normalizeField));
  const [pageCount, setPageCount] = useState(initial?.pageCount ?? 1);
  const [activePage, setActivePage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  const [sendAutomatically, setSendAutomatically] = useState(initial?.sendAutomatically ?? false);
  const [rulePatientStatus, setRulePatientStatus] = useState<RulePatientStatus>(initial?.rulePatientStatus ?? "any");
  const [ruleFrequencyMonths, setRuleFrequencyMonths] = useState<number | null>(initial?.ruleFrequencyMonths ?? null);
  const [ruleMinAge, setRuleMinAge] = useState<number | null>(initial?.ruleMinAge ?? null);
  const [ruleMaxAge, setRuleMaxAge] = useState<number | null>(initial?.ruleMaxAge ?? null);
  const [ruleAppointmentTypeIds, setRuleAppointmentTypeIds] = useState<string[]>(initial?.ruleAppointmentTypeIds ?? []);
  const [ruleProcedureCodes, setRuleProcedureCodes] = useState<string[]>(initial?.ruleProcedureCodes ?? []);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [showMedicalAlerts, setShowMedicalAlerts] = useState(false);

  useEffect(() => {
    staffApi.appointmentTypes
      .list()
      .then((rows) => setAppointmentTypes(rows.map(mapAppointmentType)))
      .catch(() => setAppointmentTypes([]));
  }, []);

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const editingField = editingFieldId ? fields.find((f) => f.id === editingFieldId) ?? null : null;
  const activeFields = fields.filter((f) => f.page === activePage);
  const isLocked = initial?.isLocked ?? false;

  function applyTemplate(name: string) {
    setTemplate(name);
    const tpl = STARTER_TEMPLATES.find((t) => t.name === name);
    if (!tpl) return;
    setTitle(tpl.name);
    setDocumentType(tpl.documentType);
    setFields(tpl.fields.map((f) => ({
      ...newField(f.type, 1),
      label: f.label,
      required: f.required,
      options: f.options.length ? [...f.options] : newField(f.type, 1).options,
    })));
    setPageCount(1);
    setActivePage(1);
  }

  function insertFieldAt(type: FormFieldType, index?: number) {
    if (type === "columns") {
      const col1 = { ...newField("text", activePage), label: "Column 1", width: "half" as const };
      const col2 = { ...newField("text", activePage), label: "Column 2", width: "half" as const };
      setFields((prev) => {
        const pageFields = prev.filter((f) => f.page === activePage);
        const others = prev.filter((f) => f.page !== activePage);
        const insertAt = index ?? pageFields.length;
        const nextPage = [...pageFields];
        nextPage.splice(insertAt, 0, col1, col2);
        return [...others, ...nextPage];
      });
      return;
    }

    const field = newField(type, activePage);
    setFields((prev) => {
      const pageFields = prev.filter((f) => f.page === activePage);
      const others = prev.filter((f) => f.page !== activePage);
      const insertAt = index ?? pageFields.length;
      const nextPage = [...pageFields];
      nextPage.splice(insertAt, 0, field);
      return [...others, ...nextPage];
    });
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
    if (editingFieldId === id) setEditingFieldId(null);
  }

  function reorderField(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    setFields((prev) => {
      const pageFields = prev.filter((f) => f.page === activePage);
      const others = prev.filter((f) => f.page !== activePage);
      const from = pageFields.findIndex((f) => f.id === dragId);
      const to = pageFields.findIndex((f) => f.id === targetId);
      if (from === -1 || to === -1) return prev;
      const nextPage = [...pageFields];
      const [moved] = nextPage.splice(from, 1);
      nextPage.splice(to, 0, moved);
      return [...others, ...nextPage];
    });
  }

  function handlePaletteDragStart(e: React.DragEvent, type: FormFieldType) {
    e.dataTransfer.setData(DRAG_FIELD_TYPE, type);
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOverCanvas(true);
  }

  function handleCanvasDrop(e: React.DragEvent, index?: number) {
    e.preventDefault();
    setDragOverCanvas(false);
    const type = e.dataTransfer.getData(DRAG_FIELD_TYPE) as FormFieldType;
    if (type) {
      insertFieldAt(type, index);
      return;
    }
    const dragId = e.dataTransfer.getData("application/x-nex-form-field-id");
    const targetId = (e.currentTarget as HTMLElement).dataset.fieldId;
    if (dragId && targetId) reorderField(dragId, targetId);
  }

  function handleSave() {
    if (submitting || isLocked) return;
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
        id: f.id,
        type: f.type,
        label: f.label.trim(),
        required: f.required,
        options: f.options,
        page: f.page,
        min_length: f.minLength,
        max_length: f.maxLength,
        conditional_field_id: f.conditionalFieldId,
        conditional_value: f.conditionalValue,
        label_position: f.labelPosition,
        sync_target: f.syncTarget,
        placeholder: f.placeholder,
        default_value: f.defaultValue,
        width: f.width,
      })),
      send_automatically: sendAutomatically,
      rule_patient_status: rulePatientStatus,
      rule_frequency_months: sendAutomatically ? ruleFrequencyMonths : null,
      rule_min_age: sendAutomatically ? ruleMinAge : null,
      rule_max_age: sendAutomatically ? ruleMaxAge : null,
      rule_appointment_type_ids: sendAutomatically ? ruleAppointmentTypeIds : [],
      rule_procedure_codes: sendAutomatically ? ruleProcedureCodes : [],
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

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900">Form builder</h2>
          <p className="text-xs text-gray-500 mt-0.5">Build forms for patients to fill out and sync to your health record system.</p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label={isLocked ? "This form has real patient submissions and can't be edited — duplicate it to make changes." : "Save and exit"}
            onClick={handleSave}
            disabled={submitting || isLocked}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : "Save and exit"}
          </IconButton>
          <IconButton label="Close" onClick={onExit} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"><X size={15} /></IconButton>
        </div>
      </div>

      {isLocked && (
        <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex-shrink-0">
          This Medical History form has real patient submissions and can no longer be edited — use <strong>Duplicate</strong> from
          the forms list to make changes.
        </div>
      )}

      {error && (
        <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
      )}

      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border bg-gray-50/50 flex-shrink-0 flex-wrap">
        {!initial && (
          <div className="relative">
            <select value={template} onChange={(e) => applyTemplate(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[180px] focus:border-teal-400">
              <option value="">Select a Template</option>
              {STARTER_TEMPLATES.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        <div className="relative">
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[150px] focus:border-teal-400">
            <option value="">Document Type</option>
            <option>Medical</option><option>Dental</option><option>Insurance</option><option>Consent</option><option>Payment</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Display Type</span>
          <div className="relative">
            <select value={displayType} onChange={(e) => setDisplayType(e.target.value as "wizard" | "single_page")} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none focus:border-teal-400">
              <option value="wizard">Wizard</option><option value="single_page">Single Page</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white min-w-[160px]" />
        </div>
        {fields.some((f) => MEDICAL_ALERTS_TYPES.includes(f.type)) && (
          <button
            onClick={() => setShowMedicalAlerts(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700 ml-auto"
          >
            <Stethoscope size={14} /> Manage medical alerts
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col sm:flex-row min-h-0">
        <div className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r border-border bg-white flex-shrink-0 overflow-x-auto sm:overflow-y-auto sm:max-h-full">
          <div className="flex sm:block">
            <p className="hidden sm:block px-4 py-3 text-sm font-bold text-gray-900 border-b border-border">Questions</p>
            {QUESTIONS.map((q) => (
              <button
                key={q.label}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, q.type)}
                onClick={() => insertFieldAt(q.type)}
                className="flex-shrink-0 sm:w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b-0 sm:border-b border-gray-50 last:border-0 whitespace-nowrap cursor-grab active:cursor-grabbing"
              >
                <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex sm:block">
            <p className="hidden sm:block px-4 py-3 text-sm font-bold text-gray-900 border-b border-t border-border">Layout</p>
            {LAYOUT.map((q) => (
              <button
                key={q.label}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, q.type)}
                onClick={() => insertFieldAt(q.type)}
                className="flex-shrink-0 sm:w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b-0 sm:border-b border-gray-50 last:border-0 whitespace-nowrap cursor-grab active:cursor-grabbing"
              >
                <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex sm:block">
            <p className="hidden sm:block px-4 py-3 text-sm font-bold text-gray-900 border-b border-t border-border">Medical History</p>
            {MEDICAL_HISTORY_FIELDS.map((q) => (
              <button
                key={q.label}
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, q.type)}
                onClick={() => insertFieldAt(q.type)}
                className="flex-shrink-0 sm:w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b-0 sm:border-b border-gray-50 last:border-0 whitespace-nowrap cursor-grab active:cursor-grabbing"
              >
                <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-gray-100 overflow-y-auto">
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

          <div className="p-4 sm:p-6">
            <div
              onDragOver={handleCanvasDragOver}
              onDragLeave={() => setDragOverCanvas(false)}
              onDrop={(e) => handleCanvasDrop(e)}
              className={`bg-white rounded-xl border p-4 min-h-[280px] transition-colors ${
                dragOverCanvas ? "border-teal-400 border-2 bg-teal-50/30" : "border-border"
              }`}
            >
              {activeFields.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg px-6 py-16 text-center text-sm text-gray-400">
                  Drag and Drop a form component
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeFields.map((f) => (
                    <div key={f.id} data-field-id={f.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleCanvasDrop(e)}>
                      <FormBuilderFieldCard
                        field={f}
                        isDragging={draggingFieldId === f.id}
                        onEdit={() => setEditingFieldId(f.id)}
                        onDuplicate={() => duplicateField(f.id)}
                        onRemove={() => removeField(f.id)}
                        onDragStart={() => setDraggingFieldId(f.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.stopPropagation();
                          handleCanvasDrop(e);
                          setDraggingFieldId(null);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <FormAutomationRulesPanel
          formName={title}
          folder={documentType || "Custom"}
          sendAutomatically={sendAutomatically}
          onSendAutomaticallyChange={setSendAutomatically}
          rulePatientStatus={rulePatientStatus}
          onRulePatientStatusChange={setRulePatientStatus}
          ruleFrequencyMonths={ruleFrequencyMonths}
          onRuleFrequencyMonthsChange={setRuleFrequencyMonths}
          ruleMinAge={ruleMinAge}
          onRuleMinAgeChange={setRuleMinAge}
          ruleMaxAge={ruleMaxAge}
          onRuleMaxAgeChange={setRuleMaxAge}
          ruleProcedureCodes={ruleProcedureCodes}
          onRuleProcedureCodesChange={setRuleProcedureCodes}
          ruleAppointmentTypeIds={ruleAppointmentTypeIds}
          onRuleAppointmentTypeIdsChange={setRuleAppointmentTypeIds}
          appointmentTypes={appointmentTypes}
          disabled={isLocked}
        />
      </div>

      {editingField && (
        <FormFieldEditorModal
          field={editingField}
          allFields={fields}
          onSave={(patch) => {
            updateField(editingField.id, patch);
            setEditingFieldId(null);
          }}
          onRemove={() => {
            removeField(editingField.id);
            setEditingFieldId(null);
          }}
          onCancel={() => setEditingFieldId(null)}
        />
      )}

      {showMedicalAlerts && <MedicalAlertsModal onClose={() => setShowMedicalAlerts(false)} />}
    </div>
  );
}
