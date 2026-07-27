import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi, mapAppointmentType } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { ApiLocation } from "../../lib/api";
import type { AppointmentType, PatientTypeRule } from "../../types";

export function BulkEditPatientTypeModal({
  locations,
  onClose,
  onSaved,
}: {
  locations: ApiLocation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [locationIndex, setLocationIndex] = useState(0);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selections, setSelections] = useState<Record<string, PatientTypeRule>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentLocation = locations[locationIndex];
  const isLast = locationIndex >= locations.length - 1;
  const progressLabel = `${locationIndex + 1} of ${locations.length}`;

  useEffect(() => {
    if (!currentLocation) return;
    setLoading(true);
    setError(null);
    staffApi.appointmentTypes
      .list(currentLocation.id)
      .then((rows) => {
        const mapped = rows.map(mapAppointmentType);
        setTypes(mapped);
        setSelections(Object.fromEntries(mapped.map((t) => [t.id, t.patientType])));
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        setError(apiErr?.detail || "Could not load appointment types for this location.");
        setTypes([]);
        setSelections({});
      })
      .finally(() => setLoading(false));
  }, [currentLocation?.id]);

  async function saveCurrentLocation(): Promise<boolean> {
    if (!currentLocation || submitting) return false;
    setError(null);
    const changed = types.filter((t) => selections[t.id] !== t.patientType);
    if (changed.length === 0) return true;

    setSubmitting(true);
    try {
      await staffApi.appointmentTypes.bulkPatientType(
        currentLocation.id,
        changed.map((t) => ({ id: t.id, patient_type: selections[t.id] }))
      );
      toastSuccess(
        `Updated ${changed.length} appointment type${changed.length !== 1 ? "s" : ""} at ${currentLocation.name}`
      );
      return true;
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save these changes — please try again.";
      setError(msg);
      toastError(msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue() {
    const ok = await saveCurrentLocation();
    if (!ok) return;
    if (isLast) {
      onSaved();
      return;
    }
    setLocationIndex((i) => i + 1);
  }

  async function handleFinish() {
    const ok = await saveCurrentLocation();
    if (ok) onSaved();
  }

  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bulk edit patient type</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {currentLocation.name} <span className="text-gray-400">· {progressLabel}</span>
            </p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading appointment types…</p>
          ) : types.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
              No appointment types to edit at this location.
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
          {locations.length > 1 ? (
            <button
              onClick={isLast ? handleFinish : handleContinue}
              disabled={submitting || loading}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? "Saving…" : isLast ? "Finish" : "Continue"}
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting || loading}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          )}
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
