import { useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, AvailabilitySlot, Operatory, RepeatMode } from "../../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AvailabilitySlotModal({
  providerId,
  operatories,
  appointmentTypes,
  useOperatories,
  initial,
  onClose,
  onSaved,
}: {
  providerId: string;
  operatories: Operatory[];
  appointmentTypes: AppointmentType[];
  useOperatories: boolean;
  initial?: AvailabilitySlot;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initial?.repeatMode ?? "weekly");
  const [specificDate, setSpecificDate] = useState(initial?.specificDate ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(initial?.dayOfWeek ?? 0);
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime?.slice(0, 5) ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime?.slice(0, 5) ?? "17:00");
  const [operatoryId, setOperatoryId] = useState(initial?.operatoryId ?? "");
  const [useProviderDefaults, setUseProviderDefaults] = useState(initial?.useProviderDefaults ?? true);
  const [typeIds, setTypeIds] = useState<string[]>(initial?.appointmentTypeIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleType(id: string) {
    setTypeIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (submitting) return;
    setError(null);

    if (repeatMode === "once" && !specificDate) {
      setError("Pick a date for this one-time slot.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }
    if (!useProviderDefaults && typeIds.length === 0) {
      setError("Select at least one appointment type, or switch back to Provider defaults.");
      return;
    }

    setSubmitting(true);
    const body = {
      provider_id: providerId,
      operatory_id: operatoryId || null,
      repeat_mode: repeatMode,
      specific_date: repeatMode === "once" ? specificDate : null,
      day_of_week: repeatMode === "weekly" ? dayOfWeek : null,
      starts_on: repeatMode === "weekly" && startsOn ? startsOn : null,
      start_time: startTime,
      end_time: endTime,
      use_provider_defaults: useProviderDefaults,
      appointment_type_ids: useProviderDefaults ? [] : typeIds,
    };
    try {
      if (initial) await staffApi.availabilitySlots.update(initial.id, body);
      else await staffApi.availabilitySlots.create(body);
      toastSuccess(initial ? "Availability slot updated" : "Availability slot added");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save this slot — please try again.";
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
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit time" : "Add time"}</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
          <div>
            <label className={labelCls}>Hours</label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" checked={repeatMode === "weekly"} onChange={() => setRepeatMode("weekly")} />
                Custom repeat
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" checked={repeatMode === "once"} onChange={() => setRepeatMode("once")} />
                On a specific date
              </label>
            </div>
            {repeatMode === "weekly" ? (
              <div className="grid grid-cols-2 gap-3">
                <select className={inputCls} value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                  {DAY_LABELS.map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className={inputCls}
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  title="Optional: starting date"
                />
              </div>
            ) : (
              <input type="date" className={inputCls} value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>From</label>
              <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>To</label>
              <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {useOperatories && (
            <div>
              <label className={labelCls}>Operatory</label>
              <select className={inputCls} value={operatoryId} onChange={(e) => setOperatoryId(e.target.value)}>
                <option value="">Location name</option>
                {operatories.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <label className={labelCls}>Appointment types</label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" checked={useProviderDefaults} onChange={() => setUseProviderDefaults(true)} />
                Provider defaults
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" checked={!useProviderDefaults} onChange={() => setUseProviderDefaults(false)} />
                Custom
              </label>
            </div>
            {!useProviderDefaults && (
              <div className="flex flex-wrap gap-1.5">
                {appointmentTypes.map((t) => (
                  <label
                    key={t.id}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                      typeIds.includes(t.id) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    <input type="checkbox" className="hidden" checked={typeIds.includes(t.id)} onChange={() => toggleType(t.id)} />
                    {t.name}
                  </label>
                ))}
              </div>
            )}
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
