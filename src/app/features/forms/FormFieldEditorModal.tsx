import { useState } from "react";
import { Plus, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import type { FormField } from "../../types";
import {
  FIELD_LABEL,
  LAYOUT_TYPES,
  MEDICAL_ALERTS_TYPES,
  OPTIONS_TYPES,
  SYNC_TARGETS,
  VALIDATION_TYPES,
} from "./formBuilderConstants";

type EditorTab = "display" | "sync" | "validation" | "conditional";

function FieldPreviewStub({ field }: { field: FormField }) {
  const label = (
    <span className="text-sm font-medium text-gray-800">
      {field.label || FIELD_LABEL[field.type]}
      {field.required && !LAYOUT_TYPES.includes(field.type) && <span className="text-red-500 ml-0.5">*</span>}
    </span>
  );

  if (field.type === "content") {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{field.label}</p>;
  }
  if (field.type === "panel") {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
        <p className="text-sm font-semibold text-gray-800">{field.label || "Panel"}</p>
        <p className="text-xs text-gray-400 mt-1">Fields below appear inside this panel.</p>
      </div>
    );
  }
  if (field.type === "columns") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-dashed border-gray-200 rounded-lg h-10" />
        <div className="border border-dashed border-gray-200 rounded-lg h-10" />
      </div>
    );
  }
  if (field.type === "location_logo") {
    return <div className="h-10 w-28 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">Logo</div>;
  }
  if (field.type === "checkbox") {
    return (
      <label className={`flex items-center gap-2 ${field.labelPosition === "left" ? "flex-row" : "flex-col items-start"}`}>
        {field.labelPosition === "left" && label}
        <span className="w-4 h-4 border border-gray-300 rounded" />
        {field.labelPosition !== "left" && label}
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className={field.labelPosition === "left" ? "flex items-start gap-3" : ""}>
        {field.labelPosition === "left" && <div className="pt-2 w-32 flex-shrink-0">{label}</div>}
        <div className="flex-1">
          {field.labelPosition !== "left" && label}
          <div className="mt-1 border border-gray-200 rounded-lg h-16 bg-white" />
        </div>
      </div>
    );
  }
  if (field.type === "signature") {
    return (
      <div>
        {label}
        <div className="mt-1 border border-dashed border-gray-300 rounded-lg h-14 bg-gray-50" />
      </div>
    );
  }
  if (OPTIONS_TYPES.includes(field.type)) {
    return (
      <div>
        {label}
        <div className="mt-1 space-y-1">
          {(field.options.length ? field.options : ["Option 1"]).slice(0, 3).map((opt) => (
            <div key={opt} className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-3 h-3 border border-gray-300 rounded-sm" />
              {opt}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={field.labelPosition === "left" ? "flex items-center gap-3" : ""}>
      {field.labelPosition === "left" && <div className="w-32 flex-shrink-0">{label}</div>}
      <div className="flex-1">
        {field.labelPosition !== "left" && label}
        <div className="mt-1 border border-gray-200 rounded-lg h-9 bg-white px-2 flex items-center text-xs text-gray-400">
          {field.placeholder || field.defaultValue || "…"}
        </div>
      </div>
    </div>
  );
}

export function FormFieldEditorModal({
  field,
  allFields,
  onSave,
  onRemove,
  onCancel,
}: {
  field: FormField;
  allFields: FormField[];
  onSave: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<FormField>({ ...field });
  const [tab, setTab] = useState<EditorTab>("display");

  const isLayout = LAYOUT_TYPES.includes(draft.type);
  const showValidation = !isLayout || draft.type === "panel";
  const showSync = !LAYOUT_TYPES.includes(draft.type) || draft.type === "panel";

  function patch(p: Partial<FormField>) {
    setDraft((prev) => ({ ...prev, ...p }));
  }

  function addOption() {
    patch({ options: [...draft.options, `Option ${draft.options.length + 1}`] });
  }

  function updateOption(index: number, value: string) {
    patch({ options: draft.options.map((o, i) => (i === index ? value : o)) });
  }

  function removeOption(index: number) {
    patch({ options: draft.options.filter((_, i) => i !== index) });
  }

  const inputCls =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white";

  const tabs: { id: EditorTab; label: string; show: boolean }[] = [
    { id: "display", label: "Display", show: true },
    { id: "sync", label: "Sync", show: showSync },
    { id: "validation", label: "Validation", show: showValidation && !MEDICAL_ALERTS_TYPES.includes(draft.type) },
    { id: "conditional", label: "Conditional", show: allFields.length > 1 },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-white w-full max-w-3xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{FIELD_LABEL[draft.type]} Component</h2>
          <IconButton label="Close" onClick={onCancel} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={15} />
          </IconButton>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex gap-1 border-b border-gray-100 mb-4">
              {tabs.filter((t) => t.show).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.id ? "border-teal-500 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "display" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                  <input value={draft.label} onChange={(e) => patch({ label: e.target.value })} className={inputCls} />
                </div>
                {!isLayout && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Label position</label>
                      <select value={draft.labelPosition} onChange={(e) => patch({ labelPosition: e.target.value as FormField["labelPosition"] })} className={inputCls}>
                        <option value="top">Top</option>
                        <option value="left">Left</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Width</label>
                      <select value={draft.width} onChange={(e) => patch({ width: e.target.value as FormField["width"] })} className={inputCls}>
                        <option value="full">Full width</option>
                        <option value="half">Half width (column)</option>
                      </select>
                    </div>
                    {!MEDICAL_ALERTS_TYPES.includes(draft.type) && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Placeholder</label>
                          <input value={draft.placeholder} onChange={(e) => patch({ placeholder: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Default value</label>
                          <input value={draft.defaultValue} onChange={(e) => patch({ defaultValue: e.target.value })} className={inputCls} />
                        </div>
                      </>
                    )}
                  </>
                )}
                {OPTIONS_TYPES.includes(draft.type) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Options</label>
                    <div className="space-y-2">
                      {draft.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={opt} onChange={(e) => updateOption(i, e.target.value)} className={inputCls} />
                          <IconButton label="Remove option" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></IconButton>
                        </div>
                      ))}
                      <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700">
                        <Plus size={12} /> Add option
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "sync" && showSync && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Map this field to a value in your health record system so answers sync to the patient chart.</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sync target</label>
                  <select value={draft.syncTarget ?? ""} onChange={(e) => patch({ syncTarget: e.target.value || null })} className={inputCls}>
                    {SYNC_TARGETS.map((t) => (
                      <option key={t.value || "none"} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tab === "validation" && showValidation && !MEDICAL_ALERTS_TYPES.includes(draft.type) && (
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input type="checkbox" checked={draft.required} onChange={(e) => patch({ required: e.target.checked })} className="accent-teal-500" />
                  Required
                </label>
                {VALIDATION_TYPES.includes(draft.type) && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Minimum length</label>
                      <input
                        type="number"
                        min={0}
                        value={draft.minLength ?? ""}
                        onChange={(e) => patch({ minLength: e.target.value === "" ? null : Number(e.target.value) })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Maximum length</label>
                      <input
                        type="number"
                        min={0}
                        value={draft.maxLength ?? ""}
                        onChange={(e) => patch({ maxLength: e.target.value === "" ? null : Number(e.target.value) })}
                        className={inputCls}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "conditional" && allFields.length > 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Show this component only when another field has a specific value.</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">This component should display</label>
                  <select className={inputCls} value="true" disabled>
                    <option value="true">True</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">When the form component</label>
                  <select
                    value={draft.conditionalFieldId ?? ""}
                    onChange={(e) => patch({ conditionalFieldId: e.target.value || null, conditionalValue: e.target.value ? draft.conditionalValue : "" })}
                    className={inputCls}
                  >
                    <option value="">Always show</option>
                    {allFields.filter((f) => f.id !== draft.id).map((f) => (
                      <option key={f.id} value={f.id}>{f.label || FIELD_LABEL[f.type]}</option>
                    ))}
                  </select>
                </div>
                {draft.conditionalFieldId && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Has the value (case-sensitive)</label>
                    <input value={draft.conditionalValue} onChange={(e) => patch({ conditionalValue: e.target.value })} className={inputCls} placeholder='e.g. Yes' />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sm:w-64 border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50/50 p-4 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</p>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <FieldPreviewStub field={draft} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onRemove} className="text-sm font-medium text-red-600 hover:text-red-700">Remove</button>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={onCancel} className="text-sm font-medium text-gray-500 hover:text-gray-700">Cancel</button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
