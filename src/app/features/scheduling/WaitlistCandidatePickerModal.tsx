import { useState } from "react";
import { CalendarClock, Clock3, Search, UserRoundX, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { DatePicker } from "../../components/shared/DatePicker";
import { staffApi, mapWaitlistPatientCandidate } from "../../lib/staff-api";
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

const GROUP_META: Record<
  Group,
  { title: string; desc: string; icon: typeof CalendarClock }
> = {
  asap: {
    title: "Your waitlist",
    desc: "Patients with appointments marked as ASAP who want an earlier opening.",
    icon: Clock3,
  },
  continuing: {
    title: "Continuing care",
    desc: "Patients who are due or past due for recare.",
    icon: CalendarClock,
  },
  missed: {
    title: "Missed or cancelled",
    desc: "Patients with missed or cancelled appointments and no upcoming visit soon.",
    icon: UserRoundX,
  },
};

export function WaitlistCandidatePickerModal({ group, providers, appointmentTypes, onClose, onAdd }: Props) {
  const [providerId, setProviderId] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [recallType, setRecallType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [missedChecked, setMissedChecked] = useState(true);
  const [cancelledChecked, setCancelledChecked] = useState(false);
  const [excludeRecent, setExcludeRecent] = useState(true);
  const [excludeRecentDays, setExcludeRecentDays] = useState(30);
  const [candidates, setCandidates] = useState<WaitlistPatientCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = GROUP_META[group];
  const Icon = meta.icon;
  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white transition-shadow";

  async function runSearch() {
    setError(null);
    setSearching(true);
    try {
      let rows: WaitlistPatientCandidate[] = [];
      const excludeDays = excludeRecent ? excludeRecentDays : 0;
      if (group === "asap") {
        rows = (
          await staffApi.waitlistRequests.searchAsap({
            providerId: providerId || undefined,
            appointmentTypeId: appointmentTypeId || undefined,
            durationMinutes: typeof durationMinutes === "number" ? durationMinutes : undefined,
            excludeRecentDays: excludeDays,
          })
        ).map(mapWaitlistPatientCandidate);
      } else if (group === "continuing") {
        if (!startDate || !endDate) {
          setError("Select a date range.");
          setSearching(false);
          return;
        }
        rows = (
          await staffApi.waitlistRequests.searchContinuingCare({
            recallType: recallType || undefined,
            startDate,
            endDate,
            excludeRecentDays: excludeDays,
          })
        ).map(mapWaitlistPatientCandidate);
      } else {
        if (!missedChecked && !cancelledChecked) {
          setError("Check at least one of Missed or Cancelled.");
          setSearching(false);
          return;
        }
        rows = (
          await staffApi.waitlistRequests.searchMissedCancelled({
            missed: missedChecked,
            cancelled: cancelledChecked,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            excludeRecentDays: excludeDays,
          })
        ).map(mapWaitlistPatientCandidate);
      }
      setCandidates(rows);
      setSelected(new Set(rows.map((r) => r.id)));
      setSearched(true);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="waitlist-picker-title"
      >
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="waitlist-picker-title" className="text-lg font-bold text-gray-900 tracking-tight">
              {meta.title}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 leading-snug">{meta.desc}</p>
          </div>
          <IconButton
            label="Close"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 flex-shrink-0"
          >
            <X size={18} />
          </IconButton>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">
          {group === "asap" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-3 space-y-3 sm:space-y-0">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Appointment type</label>
                  <select
                    className={inputCls}
                    value={appointmentTypeId}
                    onChange={(e) => setAppointmentTypeId(e.target.value)}
                  >
                    <option value="">Any</option>
                    {appointmentTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className={inputCls}
                    placeholder="Any"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : Number(e.target.value) || "")}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Provider</label>
                <select className={inputCls} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                  <option value="">Any</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {group === "continuing" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recall type</label>
                <input
                  className={inputCls}
                  value={recallType}
                  onChange={(e) => setRecallType(e.target.value)}
                  placeholder="e.g. Cleaning"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">From</label>
                <DatePicker value={startDate} onChange={setStartDate} aria-label="From date" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">To</label>
                <DatePicker value={endDate} onChange={setEndDate} aria-label="To date" />
              </div>
            </div>
          )}

          {group === "missed" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <label
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                    missedChecked ? "border-teal-300 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    checked={missedChecked}
                    onChange={(e) => setMissedChecked(e.target.checked)}
                  />
                  Missed
                </label>
                <label
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                    cancelledChecked ? "border-teal-300 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    checked={cancelledChecked}
                    onChange={(e) => setCancelledChecked(e.target.checked)}
                  />
                  Cancelled
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">From</label>
                  <DatePicker value={startDate} onChange={setStartDate} aria-label="From date" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">To</label>
                  <DatePicker value={endDate} onChange={setEndDate} aria-label="To date" />
                </div>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              checked={excludeRecent}
              onChange={(e) => setExcludeRecent(e.target.checked)}
            />
            <span className="leading-relaxed">
              Exclude patients messaged in the last{" "}
              <input
                type="number"
                min={0}
                className="w-14 mx-1 px-1.5 py-0.5 border border-gray-200 rounded-md text-center text-sm bg-white disabled:bg-gray-100"
                value={excludeRecentDays}
                onChange={(e) => setExcludeRecentDays(Math.max(0, Number(e.target.value) || 0))}
                disabled={!excludeRecent}
              />{" "}
              days
            </span>
          </label>

          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">{error}</div>
          )}

          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Search size={15} />
            {searching ? "Searching…" : "Search patients"}
          </button>

          {searched && candidates.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">No patients found</p>
              <p className="text-xs text-gray-500 mt-1">
                {group === "asap"
                  ? "Add patients on the ASAP list tab first, or widen your filters."
                  : "Try different filters or date range."}
              </p>
            </div>
          )}

          {candidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {selected.size} of {candidates.length} selected
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-teal-600 hover:text-teal-700"
                  onClick={() =>
                    setSelected(
                      selected.size === candidates.length
                        ? new Set()
                        : new Set(candidates.map((c) => c.id))
                    )
                  }
                >
                  {selected.size === candidates.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-52 overflow-y-auto">
                {candidates.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-gray-800 cursor-pointer hover:bg-teal-50/40"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                    <span className="min-w-0 truncate font-medium">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Add {selected.size} patient{selected.size !== 1 ? "s" : ""}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function WaitlistSendToEmpty({ onPickGroup }: { onPickGroup: (g: Group) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <p className="text-sm font-semibold text-gray-800 mb-1">Who should get this opening?</p>
      <p className="text-xs text-gray-500 mb-5 max-w-md">
        Pick a patient group below, or use Find a patient in the header.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
        {(
          [
            { id: "asap" as const, title: "Your waitlist", desc: "ASAP patients ready for an earlier slot", icon: Clock3 },
            { id: "continuing" as const, title: "Continuing care", desc: "Due or past due for recare", icon: CalendarClock },
            { id: "missed" as const, title: "Missed or cancelled", desc: "Missed / cancelled with no upcoming visit", icon: UserRoundX },
          ] as const
        ).map((card) => {
          const CardIcon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onPickGroup(card.id)}
              className="group px-4 py-4 rounded-2xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 text-left transition-all shadow-sm hover:shadow"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-50 group-hover:bg-teal-100 text-gray-500 group-hover:text-teal-700 flex items-center justify-center mb-3 transition-colors">
                <CardIcon size={16} />
              </div>
              <p className="text-sm font-semibold text-gray-900">{card.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{card.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
