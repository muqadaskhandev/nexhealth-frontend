import { useState } from "react";
import { Rocket, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi, mapAppointmentType, mapWaitlistPatientCandidate } from "../../lib/staff-api";
import { toastError } from "../../lib/toast";
import type { AppointmentType, Provider, WaitlistPatientCandidate } from "../../types";

type Group = "asap" | "continuing" | "missed";

type Props = {
  group: Group;
  providers: Provider[];
  appointmentTypes: AppointmentType[];
  onClose: () => void;
  onAdd: (patients: { id: string; name: string }[], templateType: "asap" | "continuing_care") => void;
};

export function WaitlistCandidatePickerModal({ group, providers, appointmentTypes, onClose, onAdd }: Props) {
  const titles: Record<Group, { title: string; desc: string }> = {
    asap: {
      title: "Your waitlist",
      desc: "Patients with appointments marked as ASAP in your health record system.",
    },
    continuing: {
      title: "Continuing care",
      desc: "Patients who are due or past due for recare.",
    },
    missed: {
      title: "Missed or cancelled appointments",
      desc: "Patients with missed or cancelled appointments and no upcoming visit in the next 6 months.",
    },
  };

  const [providerId, setProviderId] = useState("");
  const [operatoryId, setOperatoryId] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [recallType, setRecallType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [missedChecked, setMissedChecked] = useState(true);
  const [cancelledChecked, setCancelledChecked] = useState(false);
  const [excludeRecentDays, setExcludeRecentDays] = useState(30);
  const [candidates, setCandidates] = useState<WaitlistPatientCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = titles[group];
  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white";

  async function runSearch() {
    setError(null);
    setSearching(true);
    try {
      let rows: WaitlistPatientCandidate[] = [];
      if (group === "asap") {
        rows = (await staffApi.waitlistRequests.searchAsap({
          providerId: providerId || undefined,
          operatoryId: operatoryId || undefined,
          appointmentTypeId: appointmentTypeId || undefined,
          durationMinutes: durationMinutes || undefined,
          excludeRecentDays,
        })).map(mapWaitlistPatientCandidate);
      } else if (group === "continuing") {
        if (!startDate || !endDate) {
          setError("Select a date range.");
          setSearching(false);
          return;
        }
        rows = (await staffApi.waitlistRequests.searchContinuingCare({
          recallType: recallType || undefined,
          startDate,
          endDate,
          excludeRecentDays,
        })).map(mapWaitlistPatientCandidate);
      } else {
        if (!missedChecked && !cancelledChecked) {
          setError("Check at least one of Missed or Cancelled.");
          setSearching(false);
          return;
        }
        rows = (await staffApi.waitlistRequests.searchMissedCancelled({
          missed: missedChecked,
          cancelled: cancelledChecked,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          excludeRecentDays,
        })).map(mapWaitlistPatientCandidate);
      }
      setCandidates(rows);
      setSelected(new Set(rows.map((r) => r.id)));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not search for patients.");
    } finally {
      setSearching(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const picked = candidates.filter((c) => selected.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
    if (picked.length === 0) {
      setError("Select at least one patient.");
      return;
    }
    onAdd(picked, group === "continuing" ? "continuing_care" : "asap");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{meta.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{meta.desc}</p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-3">
          {group === "asap" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Appointment type</label>
                <select className={inputCls} value={appointmentTypeId} onChange={(e) => setAppointmentTypeId(e.target.value)}>
                  <option value="">Any</option>
                  {appointmentTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                <input type="number" min={5} step={5} className={inputCls} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Provider</label>
                <select className={inputCls} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                  <option value="">Any</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {group === "continuing" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Recall type</label>
                <input className={inputCls} value={recallType} onChange={(e) => setRecallType(e.target.value)} placeholder="e.g. Cleaning" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
                <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
                <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          {group === "missed" && (
            <>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={missedChecked} onChange={(e) => setMissedChecked(e.target.checked)} />
                  Missed appointments
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={cancelledChecked} onChange={(e) => setCancelledChecked(e.target.checked)} />
                  Cancelled appointments
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
                  <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
                  <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" defaultChecked />
            <span>
              Exclude patients with requests in the last{" "}
              <input
                type="number"
                min={0}
                className="w-12 mx-1 px-1 py-0.5 border border-gray-200 rounded text-center text-sm"
                value={excludeRecentDays}
                onChange={(e) => setExcludeRecentDays(Math.max(0, Number(e.target.value) || 0))}
              />
              days
            </span>
          </label>

          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

          <button
            onClick={runSearch}
            disabled={searching}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            {searching ? "Searching…" : "Search patients"}
          </button>

          {candidates.length > 0 && (
            <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
              {candidates.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="min-w-0 truncate">{c.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg"
          >
            Add {selected.size} patient{selected.size !== 1 ? "s" : ""}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function WaitlistSendToEmpty({ onPickGroup }: { onPickGroup: (g: Group) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Rocket size={32} className="text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-700 mb-4">Choose a patient group or search</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
        {[
          { id: "asap" as const, title: "Your waitlist", desc: "Patients with appointments marked as ASAP" },
          { id: "continuing" as const, title: "Continuing care", desc: "Patients due or past due for recare" },
          { id: "missed" as const, title: "Missed or cancelled", desc: "Patients who missed or cancelled" },
        ].map((card) => (
          <button
            key={card.id}
            onClick={() => onPickGroup(card.id)}
            className="px-4 py-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-left transition-colors"
          >
            <p className="text-sm font-semibold text-gray-900">{card.title}</p>
            <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
