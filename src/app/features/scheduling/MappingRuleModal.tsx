import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, MappingField, MappingRule } from "../../types";

type ConditionDraft = { field: MappingField; values: string[]; valueInput: string };

const FIELD_OPTIONS: { value: MappingField; label: string }[] = [
  { value: "visit_type", label: "Visit Type" },
  { value: "service_type", label: "Service Type" },
  { value: "procedure_code", label: "Procedure code(s)" },
  { value: "operatory", label: "Operatory" },
  { value: "provider", label: "Provider" },
];

export function MappingRuleModal({ types, initial, onClose, onSaved }: {
  types: AppointmentType[];
  initial?: MappingRule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [targetId, setTargetId] = useState(initial?.targetAppointmentTypeId ?? types[0]?.id ?? "");
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    initial && initial.conditions.length > 0
      ? initial.conditions.map((c) => ({ field: c.field, values: c.values, valueInput: "" }))
      : [{ field: "procedure_code", values: [], valueInput: "" }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addCondition() {
    setConditions((prev) => [...prev, { field: "procedure_code", values: [], valueInput: "" }]);
  }
  function removeCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateCondition(idx: number, patch: Partial<ConditionDraft>) {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function addValue(idx: number) {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const v = c.valueInput.trim();
        if (!v || c.values.includes(v)) return { ...c, valueInput: "" };
        return { ...c, values: [...c.values, v], valueInput: "" };
      })
    );
  }
  function removeValue(idx: number, value: string) {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, values: c.values.filter((v) => v !== value) } : c)));
  }

  async function handleSave() {
    if (submitting) return;
    setError(null);

    if (types.length === 0) {
      setError("Create at least one appointment type before adding a mapping rule.");
      return;
    }
    if (!targetId) {
      setError("Select an appointment type for \"then appointment type is\".");
      return;
    }
    if (conditions.some((c) => c.values.length === 0)) {
      setError("Each condition needs at least one value — type a value and press Enter, or remove the condition.");
      return;
    }

    setSubmitting(true);
    const body = {
      target_appointment_type_id: targetId,
      conditions: conditions.map((c) => ({ field: c.field, values: c.values })),
    };
    try {
      if (initial) await staffApi.mappingRules.update(initial.id, body);
      else await staffApi.mappingRules.create(body);
      toastSuccess(initial ? "Mapping rule updated" : "Mapping rule created");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save mapping rule — please check the fields and try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit rule" : "New rule"}</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}
        {types.length === 0 && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex-shrink-0">
            Create at least one appointment type before adding a mapping rule.
          </div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
          {conditions.map((cond, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">If</span>
                <select
                  className={inputCls}
                  value={cond.field}
                  onChange={(e) => updateCondition(idx, { field: e.target.value as MappingField })}
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">any of</span>
                {cond.values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 my-1.5">
                    {cond.values.map((v) => (
                      <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800">
                        {v}
                        <IconButton label="Remove" onClick={() => removeValue(idx, v)} className="text-teal-500 hover:text-teal-700">
                          <X size={11} />
                        </IconButton>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  className={inputCls}
                  value={cond.valueInput}
                  onChange={(e) => updateCondition(idx, { valueInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addValue(idx); }
                  }}
                  placeholder="Type a value, press Enter"
                />
              </div>
              {conditions.length > 1 && (
                <button onClick={() => removeCondition(idx)} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 size={12} /> Remove condition
                </button>
              )}
            </div>
          ))}
          <button onClick={addCondition} className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700">
            <Plus size={14} /> Add condition
          </button>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-600 mb-1">then appointment type is</label>
            <select className={inputCls} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
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
