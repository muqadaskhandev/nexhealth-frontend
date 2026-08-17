import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { DatePicker } from "../../components/shared/DatePicker";
import { staffApi, mapAppointmentType, mapPatient, mapProvider } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, Patient, Provider } from "../../types";

export function AddToAsapModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [futureAppts, setFutureAppts] = useState<
    { id: string; startsAt: string; providerName: string; appointmentType: string }[]
  >([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [appointmentTypeName, setAppointmentTypeName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(30);
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

  useEffect(() => {
    if (!patientId) {
      setFutureAppts([]);
      setAppointmentId("");
      return;
    }
    // Clear any previously selected appointment when switching patients.
    // Otherwise we can submit an appointment_id that belongs to a different patient,
    // which triggers "Appointment not found for this patient".
    setFutureAppts([]);
    setAppointmentId("");
    setError(null);
    setLoadingAppts(true);
    staffApi.appointments
      .list(undefined, patientId)
      .then((rows) => {
        const now = Date.now();
        const mapped = rows
          .filter((a) => a.status !== "cancelled" && new Date(a.starts_at).getTime() > now)
          .map((a) => ({
            id: a.id,
            startsAt: a.starts_at,
            providerName: a.provider_name,
            appointmentType: a.appointment_type,
          }));
        setFutureAppts(mapped);
        if (mapped.length === 1) setAppointmentId(mapped[0].id);
      })
      .finally(() => setLoadingAppts(false));
  }, [patientId]);

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
      const selectedType = appointmentTypes.find((t) => t.id === appointmentTypeId);
      if (appointmentId) {
        await staffApi.asapList.add({
          patient_id: patientId,
          appointment_id: appointmentId,
          notes,
        });
      } else {
        if (!date || !time) {
          setError("Select a date and time for the appointment, or pick an existing one.");
          setSubmitting(false);
          return;
        }
        if (!providerName) {
          setError("Select a provider.");
          setSubmitting(false);
          return;
        }
        const startsAt = new Date(`${date}T${time}:00`).toISOString();
        await staffApi.asapList.add({
          patient_id: patientId,
          provider_name: providerName,
          appointment_type: selectedType?.name || appointmentTypeName,
          appointment_type_id: appointmentTypeId || undefined,
          starts_at: startsAt,
          duration_minutes: durationMinutes,
          notes,
        });
      }
      toastSuccess(`${patientName} added to the ASAP list`);
      onAdded();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not add this patient to the ASAP list.";
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
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add to ASAP list</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Mark a patient as willing to come in earlier if an opening appears.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-3 flex-1">
          {patientId ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
              <span className="text-sm font-medium text-teal-900">{patientName}</span>
              <button type="button" onClick={() => { setPatientId(""); setPatientName(""); }} className="text-xs text-teal-600 hover:text-teal-800">Change</button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label>
              <input className={inputCls} placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
              {results.length > 0 && (
                <div className="mt-1 rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-36 overflow-y-auto">
                  {results.map((p) => (
                    <button key={p.id} type="button" onClick={() => pickPatient(p)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {patientId && (
            <>
              {loadingAppts ? (
                <p className="text-sm text-gray-400">Loading appointments…</p>
              ) : futureAppts.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mark existing appointment as ASAP</label>
                  <select className={inputCls} value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
                    <option value="">Create new appointment instead</option>
                    {futureAppts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {new Date(a.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} — {a.providerName} · {a.appointmentType}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  No future appointments found — schedule one below to add to the ASAP list.
                </p>
              )}

              {!appointmentId && (
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600">New appointment to mark ASAP</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                      <DatePicker value={date} onChange={setDate} aria-label="Appointment date" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Time *</label>
                      <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Provider *</label>
                    <select className={inputCls} value={providerName} onChange={(e) => setProviderName(e.target.value)}>
                      <option value="">Select…</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Appointment type</label>
                    <select
                      className={inputCls}
                      value={appointmentTypeId}
                      onChange={(e) => {
                        setAppointmentTypeId(e.target.value);
                        const t = appointmentTypes.find((x) => x.id === e.target.value);
                        if (t) {
                          setAppointmentTypeName(t.name);
                          setDurationMinutes(t.durationMinutes);
                        }
                      }}
                    >
                      <option value="">Select…</option>
                      {appointmentTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (minutes)</label>
                    <input type="number" min={5} step={5} className={inputCls} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  className={`${inputCls} min-h-[64px] resize-y`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred days/times, operatory, etc."
                />
              </div>
            </>
          )}

          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !patientId}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg"
          >
            {submitting ? "Adding…" : "Add to ASAP list"}
          </button>
        </div>
      </div>
    </div>
  );
}
