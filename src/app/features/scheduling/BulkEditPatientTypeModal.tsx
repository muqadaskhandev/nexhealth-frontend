import { useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, PatientTypeRule } from "../../types";

export function BulkEditPatientTypeModal({ types, onClose, onSaved }: {
  types: AppointmentType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, PatientTypeRule>>(() =>
    Object.fromEntries(types.map((t) => [t.id, t.patientType]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (submitting) return;
    setError(null);
    const changed = types.filter((t) => selections[t.id] !== t.patientType);
    if (changed.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(
        changed.map((t) => staffApi.appointmentTypes.update(t.id, { patient_type: selections[t.id] }))
      );
      toastSuccess(`Updated ${changed.length} appointment type${changed.length !== 1 ? "s" : ""}`);
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save these changes — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Bulk edit patient type</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1">
          {types.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
              No appointment types to edit yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-border">
                    <th className="text-left font-semibold py-2 px-1">Appointment type</th>
                    <th className="text-center font-semibold py-2 px-1">New patients</th>
                    <th className="text-center font-semibold py-2 px-1">Existing patients</th>
                    <th className="text-center font-semibold py-2 px-1">Both</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {types.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-1 text-gray-800 truncate max-w-[200px]">{t.name}</td>
                      {(["new", "existing", "all"] as const).map((v) => (
                        <td key={v} className="text-center py-2.5 px-1">
                          <input
                            type="radio"
                            name={`patient-type-${t.id}`}
                            checked={selections[t.id] === v}
                            onChange={() => setSelections((prev) => ({ ...prev, [t.id]: v }))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
