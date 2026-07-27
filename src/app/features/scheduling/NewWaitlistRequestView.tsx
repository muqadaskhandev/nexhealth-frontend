import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Send, X } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import {
  staffApi,
  mapAppointmentType,
  mapAvailabilityBlock,
  mapAvailabilitySlot,
  mapOperatory,
  mapPatient,
  mapProvider,
} from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { WaitlistCandidatePickerModal, WaitlistSendToEmpty } from "./WaitlistCandidatePickerModal";
import type { AppointmentType, AvailabilityBlock, AvailabilitySlot, Operatory, Patient, Provider } from "../../types";

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
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      staffApi.providers.list(),
      staffApi.operatories.list(),
      staffApi.appointmentTypes.list(),
      staffApi.availabilitySlots.list(),
      staffApi.availabilityBlocks.list(),
    ])
      .then(([p, o, types, s, b]) => {
        setProviders(p.map(mapProvider));
        setOperatories(o.map(mapOperatory));
        setAppointmentTypes(types.map(mapAppointmentType));
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
  const [groupModal, setGroupModal] = useState<"asap" | "continuing" | "missed" | null>(null);
  const [templateType, setTemplateType] = useState<"asap" | "continuing_care">("asap");
  const [addedPatients, setAddedPatients] = useState<PatientDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      staffApi.patients
        .list(searchQuery)
        .then((rows) => setSearchResults(rows.map(mapPatient)))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  function addPatientsFromGroup(
    patients: { id: string; name: string }[],
    tpl: "asap" | "continuing_care"
  ) {
    setTemplateType(tpl);
    setAddedPatients((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const merged = [...prev];
      for (const p of patients) {
        if (!ids.has(p.id)) merged.push(p);
      }
      return merged;
    });
  }

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
        template_type: templateType,
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

  const canSend = addedSlots.length > 0 && addedPatients.length > 0;

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft size={15} /> Waitlist
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Waitlist request</h1>
        </div>
        <button
          onClick={handleSendClick}
          disabled={!canSend}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Send size={15} /> Send
        </button>
      </div>

      {/* Slots */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">Appointment slots</p>
          <span className="text-xs text-gray-400">{addedSlots.length}/{MAX_SLOTS}</span>
        </div>

        {addedSlots.length > 0 && (
          <div className="px-4 sm:px-5 py-3 flex flex-wrap gap-2 border-b border-border">
            {addedSlots.map((s) => (
              <span
                key={s.key}
                className="inline-flex items-start gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 max-w-xs"
              >
                <span className="min-w-0">
                  {new Date(s.startsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" — "}
                  {new Date(s.endsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  <br />
                  <span className="text-teal-700">
                    {providerName(s.providerId)}
                    {operatoryName(s.operatoryId) ? ` · ${operatoryName(s.operatoryId)}` : ""}
                  </span>
                </span>
                <button onClick={() => removeSlot(s.key)} className="text-teal-500 hover:text-teal-800 flex-shrink-0">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="px-4 sm:px-5 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => document.getElementById("waitlist-add-slot")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <Plus size={14} /> Add slot
          </button>
        </div>

        <div id="waitlist-add-slot" className="px-4 sm:px-5 py-4 border-b border-border space-y-3">
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

        {slotError && (
          <div className="mx-4 sm:mx-5 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{slotError}</div>
        )}
      </div>

      {/* Patients */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">Send to</p>
          <div className="flex flex-wrap items-center gap-2">
            {(["asap", "continuing", "missed"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupModal(g)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700"
              >
                {g === "asap" ? "Your waitlist" : g === "continuing" ? "Continuing care" : "Missed or cancelled"}
              </button>
            ))}
            <input
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm min-w-[140px]"
              placeholder="Find a patient"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {addedPatients.length === 0 && !searchQuery.trim() ? (
          <WaitlistSendToEmpty onPickGroup={setGroupModal} />
        ) : (
          <div className="px-4 sm:px-5 py-4 space-y-3">
            {searchQuery.trim() && (
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-40 overflow-y-auto">
                {searching ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">No patients found.</p>
                ) : (
                  searchResults.map((p) => {
                    const name = `${p.firstName} ${p.lastName}`.trim();
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span className="text-sm text-gray-700">{name}</span>
                        <button
                          onClick={() => addPatient({ id: p.id, name })}
                          disabled={addedPatients.some((added) => added.id === p.id)}
                          className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-300"
                        >
                          {addedPatients.some((added) => added.id === p.id) ? "Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {addedPatients.length > 0 && (
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
        )}
      </div>

      {sendError && (
        <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{sendError}</div>
      )}
      {addedPatients.length > 100 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Smart Send will notify patients in batches of 10 every 5 minutes to protect them from spam.
        </p>
      )}

      {groupModal && (
        <WaitlistCandidatePickerModal
          group={groupModal}
          providers={providers}
          appointmentTypes={appointmentTypes}
          onClose={() => setGroupModal(null)}
          onAdd={addPatientsFromGroup}
        />
      )}

      {confirming && (
        <ConfirmModal
          title={`Send to ${addedPatients.length} patient${addedPatients.length !== 1 ? "s" : ""}?`}
          message={`Once a patient accepts a waitlist request, an appointment will be created in your health record system. NexHealth uses Smart Send to protect your patients from spam.`}
          confirmLabel="Send request now"
          submitting={sending}
          onConfirm={handleConfirmSend}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
