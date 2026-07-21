import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, PatientTypeRule } from "../../types";

type RuleDraft = { codeType: string; codes: string[]; codeInput: string };

const DURATIONS = [15, 20, 30, 40, 45, 60, 90, 120];

export function AppointmentTypeModal({ initial, onClose, onSaved, onDeleted }: {
  initial?: AppointmentType;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 30);
  const [availableOnline, setAvailableOnline] = useState(initial?.availableOnline ?? true);
  const [patientType, setPatientType] = useState<PatientTypeRule>(initial?.patientType ?? "all");
  const [allowCancel, setAllowCancel] = useState(initial?.allowPatientCancel ?? false);
  const [rules, setRules] = useState<RuleDraft[]>(
    (initial?.insertionRules ?? []).map((r) => ({ codeType: r.codeType, codes: r.codes, codeInput: "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const nameError = nameTouched && !name.trim() ? "Name is required." : null;

  function addRule() {
    setRules((prev) => [...prev, { codeType: "", codes: [], codeInput: "" }]);
  }
  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateRule(idx: number, patch: Partial<RuleDraft>) {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addCode(idx: number) {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const v = r.codeInput.trim();
        if (!v || r.codes.includes(v)) return { ...r, codeInput: "" };
        return { ...r, codes: [...r.codes, v], codeInput: "" };
      })
    );
  }
  function removeCode(idx: number, code: string) {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, codes: r.codes.filter((c) => c !== code) } : r)));
  }

  async function handleSave() {
    if (submitting) return;
    setNameTouched(true);
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const body = {
      name: name.trim(),
      duration_minutes: duration,
      available_online: availableOnline,
      patient_type: patientType,
      allow_patient_cancel: allowCancel,
      insertion_rules: rules.map((r) => ({ code_type: r.codeType, codes: r.codes })),
    };
    try {
      if (initial) await staffApi.appointmentTypes.update(initial.id, body);
      else await staffApi.appointmentTypes.create(body);
      toastSuccess(initial ? "Appointment type updated" : "Appointment type created");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save appointment type — please check the fields and try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initial || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await staffApi.appointmentTypes.delete(initial.id);
      toastSuccess("Appointment type deleted");
      onDeleted();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not delete appointment type — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
      setConfirmingDelete(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-3xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit appointment type" : "New appointment type"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">
            {error}
          </div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Details</h3>
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={`${inputCls} ${nameError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. New Patient Exam & Cleaning"
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            </div>
            <div>
              <label className={labelCls}>Duration</label>
              <select className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Available to book online?</span>
              <Toggle on={availableOnline} onChange={setAvailableOnline} />
            </label>
            <div>
              <label className={labelCls}>Patient type</label>
              <select className={inputCls} value={patientType} onChange={(e) => setPatientType(e.target.value as PatientTypeRule)}>
                <option value="new">New patients only</option>
                <option value="existing">Existing patients only</option>
                <option value="all">All patients</option>
              </select>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Allow patient to cancel?</span>
              <Toggle on={allowCancel} onChange={setAllowCancel} />
            </label>
          </div>

          {/* Insertion rules */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Insertion rules</h3>
            {rules.length === 0 && (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                You can map this appointment type to procedure codes in your health record system.
              </p>
            )}
            {rules.map((rule, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div>
                  <label className={labelCls}>Code type</label>
                  <input className={inputCls} value={rule.codeType} onChange={(e) => updateRule(idx, { codeType: e.target.value })} placeholder="e.g. CDT" />
                </div>
                <div>
                  <label className={labelCls}>Codes</label>
                  {rule.codes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {rule.codes.map((code) => (
                        <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800">
                          {code}
                          <button onClick={() => removeCode(idx, code)} className="text-teal-500 hover:text-teal-700">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    className={inputCls}
                    value={rule.codeInput}
                    onChange={(e) => updateRule(idx, { codeInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addCode(idx); }
                    }}
                    placeholder="Add procedure codes, press Enter"
                  />
                </div>
                <button onClick={() => removeRule(idx)} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 size={12} /> Remove rule
                </button>
              </div>
            ))}
            <button onClick={addRule} className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700">
              <Plus size={14} /> Add rule
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={submitting}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
          </div>
          {initial && (
            <button onClick={() => setConfirmingDelete(true)} disabled={submitting} className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
              Delete appointment type
            </button>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmModal
          title="Delete appointment type?"
          message={`"${initial?.name}" will be permanently removed and will no longer be bookable online. This can't be undone.`}
          confirmLabel="Delete"
          danger
          submitting={submitting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
