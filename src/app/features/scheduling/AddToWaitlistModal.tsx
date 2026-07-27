import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi, mapAppointmentType, mapPatient, mapProvider } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, Patient, Provider } from "../../types";

export function AddToWaitlistModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [appointmentType, setAppointmentType] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi.providers.list().then((rows) => setProviders(rows.map(mapProvider)));
    staffApi.appointmentTypes.list().then((rows) => setAppointmentTypes(rows.map(mapAppointmentType)));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      staffApi.patients
        .list(search)
        .then((rows) => setResults(rows.map(mapPatient)))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  function pickPatient(p: Patient) {
    setPatientId(p.id);
    setPatientName(`${p.firstName} ${p.lastName}`.trim());
    setSearch("");
    setResults([]);
  }

  async function handleSubmit() {
    if (!patientId) {
      setError("Select a patient.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await staffApi.waitlist.add({
        patient_id: patientId,
        provider_name: providerName,
        appointment_type: appointmentType,
        notes,
      });
      toastSuccess(`${patientName} added to the waitlist`);
      onAdded();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not add this patient to the waitlist.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add to waitlist</h2>
            <p className="text-sm text-gray-500 mt-0.5">Patient will be notified when an opening becomes available.</p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {patientId ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="text-sm font-medium text-teal-900">{patientName}</span>
              <button type="button" onClick={() => { setPatientId(""); setPatientName(""); }} className="text-xs text-teal-600 hover:text-teal-800">Change</button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label>
              <input
                className={inputCls}
                placeholder="Search by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
              {results.length > 0 && (
                <div className="mt-1 rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-36 overflow-y-auto">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickPatient(p)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred provider</label>
            <select
              className={inputCls}
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
            >
              <option value="">Any provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Appointment type</label>
            <select
              className={inputCls}
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
            >
              <option value="">Any type</option>
              {appointmentTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (preferred days/times)</label>
            <textarea
              className={`${inputCls} min-h-[72px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mornings only, prefers Dr. Smith"
            />
          </div>

          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg"
          >
            {submitting ? "Adding…" : "Add to waitlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
