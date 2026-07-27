import { useEffect, useState } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { usePractice } from "../../hooks/usePractice";
import { staffApi, mapAvailabilityBlock, mapAvailabilitySlot, mapProvider } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, AvailabilityBlock, AvailabilitySlot, Provider } from "../../types";

const DAY_MS = 24 * 60 * 60 * 1000;

function practiceSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") || "practice";
}

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

function providerOffersType(provider: Provider, slot: AvailabilitySlot, appointmentTypeId: string): boolean {
  if (slot.useProviderDefaults) return provider.defaultAppointmentTypeIds.includes(appointmentTypeId);
  return slot.appointmentTypeIds.includes(appointmentTypeId);
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

type DayPreview = { date: Date; times: number[] };

function computeNextDays(
  appointmentType: AppointmentType,
  providers: Provider[],
  slots: AvailabilitySlot[],
  blocks: AvailabilityBlock[],
  daysNeeded = 3,
  maxScan = 21
): DayPreview[] {
  const eligibleProviders = providers.filter(
    (p) => p.status === "active" && p.defaultAppointmentTypeIds.includes(appointmentType.id)
  );
  const results: DayPreview[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; results.length < daysNeeded && d < maxScan; d++) {
    const date = new Date(today.getTime() + d * DAY_MS);
    const dateStr = toDateStr(date);
    const dayOfWeek = date.getDay();
    const times = new Set<number>();

    for (const provider of eligibleProviders) {
      const providerSlots = slots.filter((s) => {
        if (s.providerId !== provider.id) return false;
        if (!providerOffersType(provider, s, appointmentType.id)) return false;
        if (s.repeatMode === "once") return s.specificDate === dateStr;
        if (s.dayOfWeek !== dayOfWeek) return false;
        if (s.startsOn && dateStr < s.startsOn) return false;
        return true;
      });
      const providerBlocks = blocks.filter((b) => b.providerId === provider.id);

      for (const slot of providerSlots) {
        const start = timeToMinutes(slot.startTime);
        const end = timeToMinutes(slot.endTime);
        for (let t = start; t + appointmentType.durationMinutes <= end; t += appointmentType.durationMinutes) {
          const blocked = providerBlocks.some((b) => blockOverlaps(b, dateStr, t, t + appointmentType.durationMinutes));
          if (!blocked) times.add(t);
        }
      }
    }

    if (times.size > 0) {
      results.push({ date, times: Array.from(times).sort((a, b) => a - b) });
    }
  }

  return results;
}

export function OneClickBookingView({ types, onBack }: { types: AppointmentType[]; onBack: () => void }) {
  const practice = usePractice(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeId, setTypeId] = useState("");

  useEffect(() => {
    Promise.all([staffApi.providers.list(), staffApi.availabilitySlots.list(), staffApi.availabilityBlocks.list()])
      .then(([p, s, b]) => {
        setProviders(p.map(mapProvider));
        setSlots(s.map(mapAvailabilitySlot));
        setBlocks(b.map(mapAvailabilityBlock));
      })
      .finally(() => setLoading(false));
  }, []);

  const appointmentType = types.find((t) => t.id === typeId);
  const days = appointmentType ? computeNextDays(appointmentType, providers, slots, blocks) : [];
  const eligibleProviders = appointmentType
    ? providers.filter((p) => p.status === "active" && p.defaultAppointmentTypeIds.includes(appointmentType.id))
    : [];

  function buildLink(): string {
    const slug = practiceSlug(practice?.name ?? "practice");
    const lid = practice?.id.slice(0, 8) ?? "000000";
    const params = new URLSearchParams({ lid });
    if (appointmentType) params.set("appointment_type_ids", appointmentType.id);
    return `https://app.nexhealth.com/appt/${slug}?${params.toString()}`;
  }

  function copySnippet() {
    if (!appointmentType || days.length === 0) return;
    const link = buildLink();
    const dayBlocks = days
      .map((day) => {
        const label = day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        const buttons = day.times
          .map(
            (t) =>
              `<a href="${link}" target="_blank" style="display:block;margin:4px 0;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;color:#111827;font-size:13px;">${minutesToLabel(t)}</a>`
          )
          .join("");
        return `<td style="vertical-align:top;padding:0 8px;"><div style="font-weight:600;font-size:12px;color:#374151;margin-bottom:6px;">${label}</div>${buttons}</td>`;
      })
      .join("");
    const snippet = `<div><p style="font-size:13px;color:#374151;">Book your ${appointmentType.name} appointment:</p><table role="presentation"><tr>${dayBlocks}</tr></table></div>`;
    navigator.clipboard.writeText(snippet);
    toastSuccess("1-click booking snippet copied");
  }

  const selectCls =
    "w-full sm:w-auto px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} /> Appointment types
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <h1 className="text-2xl font-bold text-gray-900">1-click booking</h1>
      </div>
      <p className="text-sm text-gray-500">
        Speeds up online booking by showing the next 3 days' openings directly in an email or text — patients pick a
        time in one tap.
      </p>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Appointment type</label>
          <select className={selectCls} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Select an appointment type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {!typeId && (
            <p className="text-xs text-gray-400 mt-2">Select an appointment type to preview its next 3 days of openings.</p>
          )}
        </div>

        {typeId && (
          <div className="px-4 sm:px-5 py-4 space-y-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
            ) : eligibleProviders.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                No active providers offer this appointment type yet — add it to a provider's default appointment types first.
              </p>
            ) : days.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                No openings found in the next 3 weeks for this appointment type.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {eligibleProviders.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5" title={p.name}>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                          {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  <span className="text-xs text-gray-500">{eligibleProviders.map((p) => p.name).join(", ")}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {days.map((day) => (
                    <div key={toDateStr(day.date)} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        {day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {day.times.map((t) => (
                          <div key={t} className="px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-700 text-center">
                            {minutesToLabel(t)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={copySnippet}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Copy size={14} /> Copy snippet
                </button>
                <p className="text-xs text-gray-400">
                  Paste this into an email or text template. Each time links to your online booking page for this
                  appointment type.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
