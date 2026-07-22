import { useState } from "react";
import { X } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, Provider } from "../../types";

export function ProviderDefaultsModal({ provider, appointmentTypes, mode, onClose, onSaved }: {
  provider: Provider;
  appointmentTypes: AppointmentType[];
  mode: "types" | "insurances";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [typeIds, setTypeIds] = useState<string[]>(provider.defaultAppointmentTypeIds);
  const [insurances, setInsurances] = useState<string[]>(provider.defaultInsurances);
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleType(id: string) {
    setTypeIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function addPastedInsurances() {
    const names = pasteText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setInsurances((prev) => Array.from(new Set([...prev, ...names])));
    setPasteText("");
  }

  function removeInsurance(name: string) {
    setInsurances((prev) => prev.filter((i) => i !== name));
  }

  async function handleSave() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const body =
      mode === "types"
        ? { default_appointment_type_ids: typeIds }
        : { default_insurances: insurances };
    try {
      await staffApi.providers.update(provider.id, body);
      toastSuccess(mode === "types" ? "Default appointment types updated" : "Default insurances updated");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save — please try again.";
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
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "types" ? "Default appointment types" : "Default insurances"} for {provider.name}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1">
          {mode === "types" ? (
            appointmentTypes.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                Create an appointment type first, then come back to assign it to this provider.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {appointmentTypes.map((t) => (
                  <label key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                    <span className="text-sm text-gray-800 truncate">{t.name}</span>
                    <Toggle on={typeIds.includes(t.id)} onChange={() => toggleType(t.id)} />
                  </label>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {insurances.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {insurances.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800">
                      {name}
                      <button onClick={() => removeInsurance(name)} className="text-teal-500 hover:text-teal-700">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {insurances.length === 0 && (
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                  No insurances added yet.
                </p>
              )}
              <div>
                <textarea
                  className={`${inputCls} min-h-[80px]`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste insurance names, separated by commas or new lines"
                />
                <button
                  onClick={addPastedInsurances}
                  className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  + Add insurance(s)
                </button>
              </div>
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
