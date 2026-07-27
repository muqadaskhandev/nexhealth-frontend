import { useState } from "react";
import { X } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { BookingFieldType, BookingFormField, PatientTypeRule } from "../../types";

const FIELD_TYPE_OPTIONS: { value: BookingFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "note", label: "Note" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "payment", label: "Payment" },
];

export function BookingFormFieldModal({ initial, onClose, onSaved }: {
  initial?: BookingFormField;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fieldType, setFieldType] = useState<BookingFieldType>(initial?.fieldType ?? "text");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [showTo, setShowTo] = useState<PatientTypeRule>(initial?.showTo ?? "all");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [noteText, setNoteText] = useState(initial?.noteText ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? []);
  const [optionInput, setOptionInput] = useState("");
  const [addToAllLocations, setAddToAllLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelTouched, setLabelTouched] = useState(false);

  const labelError = labelTouched && !label.trim() ? "Label is required." : null;
  const isSelectType = fieldType === "single_select" || fieldType === "multi_select";

  function addOption() {
    const v = optionInput.trim();
    if (!v || options.includes(v)) {
      setOptionInput("");
      return;
    }
    setOptions((prev) => [...prev, v]);
    setOptionInput("");
  }

  function removeOption(opt: string) {
    setOptions((prev) => prev.filter((o) => o !== opt));
  }

  async function handleSave() {
    if (submitting) return;
    setLabelTouched(true);
    setError(null);

    if (!label.trim()) return;
    if (fieldType === "note" && !noteText.trim()) {
      setError("Note fields need note text.");
      return;
    }
    if (isSelectType && options.length === 0) {
      setError("Select fields need at least one option.");
      return;
    }

    setSubmitting(true);
    const body = {
      field_type: fieldType,
      label: label.trim(),
      show_to: showTo,
      required,
      note_text: fieldType === "note" ? noteText.trim() : "",
      options: isSelectType ? options : [],
      add_to_all_locations: addToAllLocations,
    };
    try {
      if (initial) await staffApi.bookingFormFields.update(initial.id, body);
      else await staffApi.bookingFormFields.create(body);
      toastSuccess(initial ? "Field updated" : "Field added");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save this field — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit field" : "New field"}</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
          <div>
            <label className={labelCls}>Field type</label>
            <select className={inputCls} value={fieldType} onChange={(e) => setFieldType(e.target.value as BookingFieldType)}>
              {FIELD_TYPE_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {fieldType === "payment" && (
            <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Payment fields are only available with NexHealth Payments and capture a card on file for no-show or
              cancellation charges. Contact your NexHealth rep to enable Payments before using this field.
            </div>
          )}

          <div>
            <label className={labelCls}>Label</label>
            <input
              className={`${inputCls} ${labelError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => setLabelTouched(true)}
              placeholder="e.g. What is your favorite dessert?"
            />
            {labelError && <p className="text-xs text-red-600 mt-1">{labelError}</p>}
          </div>

          <div>
            <label className={labelCls}>Show to patients</label>
            <select className={inputCls} value={showTo} onChange={(e) => setShowTo(e.target.value as PatientTypeRule)}>
              <option value="all">All patients</option>
              <option value="new">New patients only</option>
              <option value="existing">Existing patients only</option>
            </select>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700">Required?</span>
            <Toggle on={required} onChange={setRequired} />
          </label>

          {!initial && (
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Add to all locations</span>
              <Toggle on={addToAllLocations} onChange={setAddToAllLocations} />
            </label>
          )}

          {fieldType === "note" && (
            <div>
              <label className={labelCls}>Note text</label>
              <textarea
                className={`${inputCls} min-h-[80px]`}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Text shown to the patient — e.g. cancellation policy"
              />
            </div>
          )}

          {isSelectType && (
            <div>
              <label className={labelCls}>Options</label>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {options.map((opt) => (
                    <span key={opt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800">
                      {opt}
                      <IconButton label="Remove" onClick={() => removeOption(opt)} className="text-teal-500 hover:text-teal-700">
                        <X size={11} />
                      </IconButton>
                    </span>
                  ))}
                </div>
              )}
              <input
                className={inputCls}
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addOption(); }
                }}
                placeholder="Add an option, press Enter"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
