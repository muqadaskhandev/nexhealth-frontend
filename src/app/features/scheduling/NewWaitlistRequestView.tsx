import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import {
  staffApi,
  mapAvailabilityBlock,
  mapAvailabilitySlot,
  mapOperatory,
  mapPatient,
  mapProvider,
  mapWaitlistPatientCandidate,
} from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type {
  AvailabilityBlock,
  AvailabilitySlot,
  Operatory,
  Patient,
  Provider,
  WaitlistPatientCandidate,
} from "../../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SLOTS = 10;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function blockOverlaps(block: AvailabilityBlock, dateStr: string, startMin: number, endMin: number): boolean {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = dayStart + DAY_MS;
  const blockStart = new Date(block.startsAt).getTime();
  const blockEnd = new Date(block.endsAt).getTime();
  if (blockEnd <= dayStart || blockStart >= dayEnd) return false;
  const slotStart = dayStart + startMin * 60 * 1000;
  const slotEnd = dayStart + endMin * 60 * 1000;
  return blockStart < slotEnd && blockEnd > slotStart;
}

type OpenWindow = {
  key: string;
  dateStr: string;
  dayLabel: string;
  startMin: number;
  startsAtIso: string;
  endsAtIso: string;
  timeLabel: string;
};

function computeOpenWindows(
  provider: Provider,
  slots: AvailabilitySlot[],
  blocks: AvailabilityBlock[],
  durationMinutes: number,
  daysNeeded = 5,
  maxScan = 21
): OpenWindow[] {
  const providerSlots = slots.filter((s) => s.providerId === provider.id);
  const providerBlocks = blocks.filter((b) => b.providerId === provider.id);
  const results: OpenWindow[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysWithOpenings = 0;

  for (let d = 0; daysWithOpenings < daysNeeded && d < maxScan; d++) {
    const date = new Date(today.getTime() + d * DAY_MS);
    const dateStr = toDateStr(date);
    const dayOfWeek = date.getDay();
    const dayLabel = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

    const daySlots = providerSlots.filter((s) => {
      if (s.repeatMode === "once") return s.specificDate === dateStr;
      if (s.dayOfWeek !== dayOfWeek) return false;
      if (s.startsOn && dateStr < s.startsOn) return false;
      return true;
    });

    const dayWindows: OpenWindow[] = [];
    for (const slot of daySlots) {
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);
      for (let t = start; t + durationMinutes <= end; t += durationMinutes) {
        const blocked = providerBlocks.some((b) => blockOverlaps(b, dateStr, t, t + durationMinutes));
        if (blocked) continue;
        const startsAt = new Date(`${dateStr}T00:00:00`);
        startsAt.setMinutes(startsAt.getMinutes() + t);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
        dayWindows.push({
          key: `${dateStr}-${t}`,
          dateStr,
          dayLabel,
          startMin: t,
          startsAtIso: startsAt.toISOString(),
          endsAtIso: endsAt.toISOString(),
          timeLabel: minutesToLabel(t),
        });
      }
    }
    if (dayWindows.length > 0) {
      daysWithOpenings++;
      results.push(...dayWindows);
    }
  }

  return results;
}

type SlotDraft = {
  key: string;
  providerId: string;
  operatoryId: string | null;
  startsAt: string;
  endsAt: string;
};

type PatientDraft = { id: string; name: string };

export function NewWaitlistRequestView({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { activeLocation } = useAuth();
  const useOperatories = activeLocation?.set_availability_by_operatory ?? false;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      staffApi.providers.list(),
      staffApi.operatories.list(),
      staffApi.availabilitySlots.list(),
      staffApi.availabilityBlocks.list(),
    ])
      .then(([p, o, s, b]) => {
        setProviders(p.map(mapProvider));
        setOperatories(o.map(mapOperatory));
        setSlots(s.map(mapAvailabilitySlot));
        setBlocks(b.map(mapAvailabilityBlock));
      })
      .finally(() => setLoading(false));
  }, []);

  const [addedSlots, setAddedSlots] = useState<SlotDraft[]>([]);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Manual slot entry
  const [manualDate, setManualDate] = useState("");
  const [manualFrom, setManualFrom] = useState("09:00");
  const [manualTo, setManualTo] = useState("09:30");
  const [manualProviderId, setManualProviderId] = useState("");
  const [manualOperatoryId, setManualOperatoryId] = useState("");

  // Open-slot picker
  const [pickerProviderId, setPickerProviderId] = useState("");
  const [pickerDuration, setPickerDuration] = useState(30);
  const pickerProvider = providers.find((p) => p.id === pickerProviderId);
  const openWindows = useMemo(
    () => (pickerProvider ? computeOpenWindows(pickerProvider, slots, blocks, pickerDuration) : []),
    [pickerProvider, slots, blocks, pickerDuration]
  );

  function addSlot(draft: Omit<SlotDraft, "key">) {
    if (addedSlots.length >= MAX_SLOTS) {
      setSlotError(`You can add up to ${MAX_SLOTS} slots per request.`);
      return;
    }
    setSlotError(null);
    setAddedSlots((prev) => [...prev, { ...draft, key: `${draft.startsAt}-${draft.providerId}-${Math.random()}` }]);
  }

  function addManualSlot() {
    setSlotError(null);
    if (!manualDate || !manualFrom || !manualTo) {
      setSlotError("Pick a date, start time, and end time.");
      return;
    }
    if (!manualProviderId) {
      setSlotError("Select a provider for this slot.");
      return;
    }
    if (manualTo <= manualFrom) {
      setSlotError("End time must be after start time.");
      return;
    }
    const startsAt = new Date(`${manualDate}T${manualFrom}:00`);
    const endsAt = new Date(`${manualDate}T${manualTo}:00`);
    addSlot({
      providerId: manualProviderId,
      operatoryId: manualOperatoryId || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }

  function toggleOpenWindow(w: OpenWindow) {
    const already = addedSlots.find((s) => s.startsAt === w.startsAtIso && s.providerId === pickerProviderId);
    if (already) {
      setAddedSlots((prev) => prev.filter((s) => s.key !== already.key));
      return;
    }
    addSlot({ providerId: pickerProviderId, operatoryId: null, startsAt: w.startsAtIso, endsAt: w.endsAtIso });
  }

  function removeSlot(key: string) {
    setAddedSlots((prev) => prev.filter((s) => s.key !== key));
  }

  function providerName(id: string): string {
    return providers.find((p) => p.id === id)?.name ?? "Unknown provider";
  }
  function operatoryName(id: string | null): string | null {
    if (!id) return null;
    return operatories.find((o) => o.id === id)?.name ?? null;
  }

  // Patients
  const [patientTab, setPatientTab] = useState<"asap" | "continuing" | "missed" | "search">("missed");
  const [addedPatients, setAddedPatients] = useState<PatientDraft[]>([]);

  const [missedChecked, setMissedChecked] = useState(true);
  const [cancelledChecked, setCancelledChecked] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [excludeRecentDays, setExcludeRecentDays] = useState(30);
  const [candidates, setCandidates] = useState<WaitlistPatientCandidate[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  async function searchCandidates() {
    if (!missedChecked && !cancelledChecked) {
      setCandidateError("Check at least one of Missed or Cancelled.");
      return;
    }
    setCandidateError(null);
    setSearchingCandidates(true);
    try {
      const rows = await staffApi.waitlistRequests.searchMissedCancelled({
        missed: missedChecked,
        cancelled: cancelledChecked,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        excludeRecentDays,
      });
      setCandidates(rows.map(mapWaitlistPatientCandidate));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not search for candidates — please try again.");
    } finally {
      setSearchingCandidates(false);
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (patientTab !== "search") return;
    setSearching(true);
    const handle = setTimeout(() => {
      staffApi.patients
        .list(searchQuery)
        .then((rows) => setSearchResults(rows.map(mapPatient)))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, patientTab]);

  function addPatient(p: PatientDraft) {
    if (addedPatients.some((added) => added.id === p.id)) return;
    setAddedPatients((prev) => [...prev, p]);
  }
  function removePatient(id: string) {
    setAddedPatients((prev) => prev.filter((p) => p.id !== id));
  }

  // Send
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  function handleSendClick() {
    if (addedSlots.length === 0) {
      setSendError("Add at least one time slot before sending.");
      return;
    }
    if (addedPatients.length === 0) {
      setSendError("Add at least one patient before sending.");
      return;
    }
    setSendError(null);
    setConfirming(true);
  }

  async function handleConfirmSend() {
    setSending(true);
    try {
      await staffApi.waitlistRequests.create({
        slots: addedSlots.map((s) => ({
          provider_id: s.providerId,
          operatory_id: s.operatoryId,
          starts_at: s.startsAt,
          ends_at: s.endsAt,
        })),
        patient_ids: addedPatients.map((p) => p.id),
      });
      toastSuccess(`Waitlist request sent to ${addedPatients.length} patient${addedPatients.length !== 1 ? "s" : ""}`);
      onCreated();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not send this waitlist request — please try again.");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex-shrink-0 ${
      active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
    }`;

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} /> Waitlist
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <h1 className="text-2xl font-bold text-gray-900">New waitlist request</h1>
      </div>
      <p className="text-sm text-gray-500">
        Offer up to {MAX_SLOTS} open time slots to a batch of patients — the first to accept claims it.
      </p>

      {/* Slots */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-gray-900">1. Add time slots</p>
          <p className="text-xs text-gray-500 mt-0.5">Enter a time manually, or pick from a provider's real open availability.</p>
        </div>

        <div className="px-4 sm:px-5 py-4 border-b border-border space-y-3">
          <p className="text-xs font-semibold text-gray-600">Manually create slot</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>From</label>
                <input type="time" className={inputCls} value={manualFrom} onChange={(e) => setManualFrom(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>To</label>
                <input type="time" className={inputCls} value={manualTo} onChange={(e) => setManualTo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Provider</label>
              <select className={inputCls} value={manualProviderId} onChange={(e) => setManualProviderId(e.target.value)}>
                <option value="">Select a provider…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {useOperatories && (
              <div>
                <label className={labelCls}>Operatory</label>
                <select className={inputCls} value={manualOperatoryId} onChange={(e) => setManualOperatoryId(e.target.value)}>
                  <option value="">None</option>
                  {operatories.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={addManualSlot}
            className="px-4 py-2 bg-white border border-teal-500 text-teal-600 hover:bg-teal-50 text-sm font-semibold rounded-lg transition-colors"
          >
            Add slot
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 border-b border-border space-y-3">
          <p className="text-xs font-semibold text-gray-600">Or select from open slots</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Provider</label>
              <select className={inputCls} value={pickerProviderId} onChange={(e) => setPickerProviderId(e.target.value)}>
                <option value="">Select a provider…</option>
                {providers.filter((p) => p.status === "active").map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                className={inputCls}
                value={pickerDuration}
                onChange={(e) => setPickerDuration(Math.max(5, Number(e.target.value) || 5))}
              />
            </div>
          </div>
          {pickerProviderId && (
            loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading availability…</p>
            ) : openWindows.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                No open availability found for this provider in the next few weeks.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-3">
                {Object.entries(
                  openWindows.reduce<Record<string, OpenWindow[]>>((acc, w) => {
                    (acc[w.dayLabel] ??= []).push(w);
                    return acc;
                  }, {})
                ).map(([dayLabel, windows]) => (
                  <div key={dayLabel}>
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">{dayLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {windows.map((w) => {
                        const isAdded = addedSlots.some(
                          (s) => s.startsAt === w.startsAtIso && s.providerId === pickerProviderId
                        );
                        return (
                          <button
                            key={w.key}
                            onClick={() => toggleOpenWindow(w)}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                              isAdded
                                ? "bg-teal-500 border-teal-500 text-white"
                                : "border-gray-200 text-gray-700 hover:border-teal-300"
                            }`}
                          >
                            {w.timeLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-2">
          <p className="text-xs font-semibold text-gray-600">
            Added slots ({addedSlots.length}/{MAX_SLOTS})
          </p>
          {slotError && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{slotError}</div>
          )}
          {addedSlots.length === 0 ? (
            <p className="text-sm text-gray-400">No slots added yet.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {addedSlots.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-sm text-gray-700 min-w-0 truncate">
                    {new Date(s.startsAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {providerName(s.providerId)}
                    {operatoryName(s.operatoryId) ? ` · ${operatoryName(s.operatoryId)}` : ""}
                  </span>
                  <button onClick={() => removeSlot(s.key)} className="text-gray-400 hover:text-red-600 flex-shrink-0">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patients */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-gray-900">2. Add patients</p>
          <p className="text-xs text-gray-500 mt-0.5">Choose who to notify about these openings.</p>
        </div>

        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 overflow-x-auto">
          <button className={tabCls(patientTab === "asap")} disabled title="Requires EHR connection">
            ASAP list
          </button>
          <button className={tabCls(patientTab === "continuing")} disabled title="Requires EHR connection">
            Continuing care
          </button>
          <button className={tabCls(patientTab === "missed")} onClick={() => setPatientTab("missed")}>
            Missed or cancelled
          </button>
          <button className={tabCls(patientTab === "search")} onClick={() => setPatientTab("search")}>
            Manually search
          </button>
        </div>

        {(patientTab === "asap" || patientTab === "continuing") && (
          <div className="px-4 sm:px-5 py-4">
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
              This list is built from your EHR's recall/continuing-care data, which isn't connected in this demo.
            </p>
          </div>
        )}

        {patientTab === "missed" && (
          <div className="px-4 sm:px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={missedChecked} onChange={(e) => setMissedChecked(e.target.checked)} />
                Missed appointments
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={cancelledChecked} onChange={(e) => setCancelledChecked(e.target.checked)} />
                Cancelled appointments
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>From</label>
                <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>To</label>
                <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Exclude notified in last (days)</label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={excludeRecentDays}
                  onChange={(e) => setExcludeRecentDays(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
            {candidateError && (
              <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{candidateError}</div>
            )}
            <button
              onClick={searchCandidates}
              disabled={searchingCandidates}
              className="px-4 py-2 bg-white border border-teal-500 text-teal-600 hover:bg-teal-50 text-sm font-semibold rounded-lg transition-colors"
            >
              {searchingCandidates ? "Searching…" : "Search"}
            </button>
            {candidates.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
                {candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <span className="text-sm text-gray-700 min-w-0 truncate">
                      {c.name}
                      <span className="text-xs text-gray-400 ml-2 capitalize">
                        {c.reason}
                        {c.appointmentAt ? ` · ${new Date(c.appointmentAt).toLocaleDateString()}` : ""}
                      </span>
                    </span>
                    <button
                      onClick={() => addPatient({ id: c.id, name: c.name })}
                      disabled={addedPatients.some((p) => p.id === c.id)}
                      className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-300 flex-shrink-0"
                    >
                      {addedPatients.some((p) => p.id === c.id) ? "Added" : "+ Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {patientTab === "search" && (
          <div className="px-4 sm:px-5 py-4 space-y-3">
            <input
              className={inputCls}
              placeholder="Search patients by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching ? (
              <p className="text-sm text-gray-400 py-4 text-center">Searching…</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No patients found.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
                {searchResults.map((p) => {
                  const name = `${p.firstName} ${p.lastName}`.trim();
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                      <span className="text-sm text-gray-700 min-w-0 truncate">{name}</span>
                      <button
                        onClick={() => addPatient({ id: p.id, name })}
                        disabled={addedPatients.some((added) => added.id === p.id)}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-300 flex-shrink-0"
                      >
                        {addedPatients.some((added) => added.id === p.id) ? "Added" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="px-4 sm:px-5 py-4 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-gray-600">Selected patients ({addedPatients.length})</p>
          {addedPatients.length === 0 ? (
            <p className="text-sm text-gray-400">No patients added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {addedPatients.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-medium text-teal-800"
                >
                  {p.name}
                  <button onClick={() => removePatient(p.id)} className="text-teal-500 hover:text-teal-800">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-5 space-y-3">
        <p className="text-sm text-gray-700">
          This will send to <span className="font-semibold">{addedPatients.length}</span> patient
          {addedPatients.length !== 1 ? "s" : ""} across <span className="font-semibold">{addedSlots.length}</span> slot
          {addedSlots.length !== 1 ? "s" : ""}. The first patient to accept claims the slot and gets an appointment
          automatically.
        </p>
        {addedPatients.length > 100 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Smart Send will notify this many patients in small batches to avoid overbooking a single slot.
          </p>
        )}
        {sendError && (
          <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{sendError}</div>
        )}
        <button
          onClick={handleSendClick}
          className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Send request now
        </button>
      </div>

      {confirming && (
        <ConfirmModal
          title="Send waitlist request?"
          message={`We'll text ${addedPatients.length} patient${addedPatients.length !== 1 ? "s" : ""} about ${addedSlots.length} open time${addedSlots.length !== 1 ? "s" : ""}. The first to tap Book now claims it and an appointment is created automatically.`}
          confirmLabel="Send request"
          submitting={sending}
          onConfirm={handleConfirmSend}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
