import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Pencil, X } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { Toggle } from "../../components/shared/Toggle";

export type ServiceHoursDay = {
  day: number;
  unavailable: boolean;
  start: string;
  end: string;
};

export type CustomDateHours = {
  id: string;
  date: string;
  label: string;
  unavailable: boolean;
  start: string;
  end: string;
};

export type OutOfOfficeSettings = {
  id: string;
  location_id: string;
  enabled: boolean;
  auto_reply_message: string;
  service_hours: ServiceHoursDay[];
  custom_dates: CustomDateHours[];
  shared_location_ids: string[];
  updated_at: string;
  reply_throttle_minutes: number;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_MSG =
  "Thank you for your text message. Our staff is unavailable and will reach out as soon as possible.";

function formatLocationLine(loc: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}) {
  const cityLine = [loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ");
  return [loc.address, cityLine].filter(Boolean).join(", ") || loc.name;
}

function parseHhMm(s: string): { h: number; m: number } {
  const [a, b] = (s || "09:00").split(":");
  return { h: Number(a) || 0, m: Number(b) || 0 };
}

function formatAmPm(s: string): string {
  const { h, m } = parseHhMm(s);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatHoursRange(day: ServiceHoursDay | CustomDateHours): string {
  if (day.unavailable) return "Unavailable";
  return `${formatAmPm(day.start)} - ${formatAmPm(day.end)}`;
}

function ensureWeek(hours: ServiceHoursDay[]): ServiceHoursDay[] {
  return DAY_NAMES.map((_, day) => {
    const existing = hours.find((h) => h.day === day);
    if (existing) return { ...existing };
    const weekend = day === 0 || day === 6;
    return {
      day,
      unavailable: weekend,
      start: "09:00",
      end: "17:00",
    };
  });
}

function AutoReplyMessageModal({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (msg: string) => Promise<void>;
}) {
  const [msg, setMsg] = useState(initial || DEFAULT_MSG);
  const [saving, setSaving] = useState(false);
  const max = 320;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">Auto-reply message</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, max))}
            rows={4}
            className="w-full px-3 py-2 border-2 border-teal-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-100 resize-y"
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {msg.length}/{max} Characters
          </p>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            disabled={saving || !msg.trim()}
            onClick={() => {
              setSaving(true);
              void onSave(msg.trim())
                .then(onClose)
                .finally(() => setSaving(false));
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceHoursModal({
  initial,
  onClose,
  onSave,
}: {
  initial: ServiceHoursDay[];
  onClose: () => void;
  onSave: (hours: ServiceHoursDay[]) => Promise<void>;
}) {
  const [hours, setHours] = useState(() => ensureWeek(initial));
  const [saving, setSaving] = useState(false);

  function updateDay(day: number, patch: Partial<ServiceHoursDay>) {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">Service hours</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {hours.map((h) => (
            <div
              key={h.day}
              className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 last:border-0"
            >
              <span className="w-24 text-sm font-medium text-gray-800">{DAY_NAMES[h.day]}</span>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 mr-2">
                <input
                  type="checkbox"
                  checked={h.unavailable}
                  onChange={(e) => updateDay(h.day, { unavailable: e.target.checked })}
                />
                Unavailable
              </label>
              {!h.unavailable && (
                <>
                  <input
                    type="time"
                    value={h.start}
                    onChange={(e) => updateDay(h.day, { start: e.target.value || "09:00" })}
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="time"
                    value={h.end}
                    onChange={(e) => updateDay(h.day, { end: e.target.value || "17:00" })}
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm"
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void onSave(hours)
                .then(onClose)
                .finally(() => setSaving(false));
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomDateModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: CustomDateHours | null;
  onClose: () => void;
  onSave: (row: CustomDateHours) => Promise<void>;
}) {
  const [date, setDate] = useState(initial?.date || "");
  const [label, setLabel] = useState(initial?.label || "");
  const [unavailable, setUnavailable] = useState(initial?.unavailable ?? true);
  const [start, setStart] = useState(initial?.start || "09:00");
  const [end, setEnd] = useState(initial?.end || "17:00");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">
            {initial ? "Edit custom date" : "Add custom date"}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Label (optional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Holiday, vacation…"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={unavailable}
              onChange={(e) => setUnavailable(e.target.checked)}
            />
            Closed / unavailable all day
          </label>
          {!unavailable && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm"
              />
              <span className="text-gray-400">–</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm"
              />
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !date}
            onClick={() => {
              setSaving(true);
              void onSave({
                id: initial?.id || crypto.randomUUID(),
                date,
                label: label.trim(),
                unavailable,
                start,
                end,
              })
                .then(onClose)
                .finally(() => setSaving(false));
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareLocationsModal({
  selected,
  onClose,
  onSave,
}: {
  selected: string[];
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const { locations, activeLocation } = useAuth();
  const [shared, setShared] = useState(() => new Set(selected));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const otherLocations = useMemo(
    () => locations.filter((l) => l.id !== activeLocation?.id),
    [locations, activeLocation?.id]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return otherLocations;
    return otherLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q)
    );
  }, [otherLocations, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">Share with other locations</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">No other locations</p>
            ) : (
              filtered.map((loc) => {
                const on = shared.has(loc.id);
                return (
                  <label
                    key={loc.id}
                    className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer ${
                      on ? "bg-teal-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setShared((prev) => {
                          const next = new Set(prev);
                          if (next.has(loc.id)) next.delete(loc.id);
                          else next.add(loc.id);
                          return next;
                        });
                      }}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900">{loc.name}</span>
                      <span className="block text-xs text-gray-500">{formatLocationLine(loc)}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void onSave([...shared])
                .then(onClose)
                .finally(() => setSaving(false));
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

export function OutOfOfficeSettingsPanel() {
  const [settings, setSettings] = useState<OutOfOfficeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editHours, setEditHours] = useState(false);
  const [editMessage, setEditMessage] = useState(false);
  const [editCustom, setEditCustom] = useState<CustomDateHours | null | "new">(null);
  const [shareOpen, setShareOpen] = useState(false);

  async function load() {
    try {
      const row = await staffApi.outOfOffice.get();
      setSettings({
        ...row,
        service_hours: ensureWeek(row.service_hours || []),
      });
    } catch {
      toastError("Could not load out-of-office settings.");
      setSettings(null);
    }
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function patch(body: Record<string, unknown>) {
    try {
      const row = await staffApi.outOfOffice.update(body);
      setSettings({
        ...row,
        service_hours: ensureWeek(row.service_hours || []),
      });
      return row;
    } catch {
      toastError("Could not save out-of-office settings.");
      throw new Error("save failed");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading out-of-office…</p>;
  }
  if (!settings) return null;

  const hours = ensureWeek(settings.service_hours);
  const throttle = settings.reply_throttle_minutes || 30;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-gray-900">Set up out-of-office replies</h3>
        <p className="text-sm text-gray-500 mt-1">
          Out-of-office replies are sent automatically to patients who send you an SMS message
          outside of your designated service hours so patients know when you&apos;ll be back.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        The out-of-office reply is limited to sending once every {throttle} minutes to reduce
        repetition during patient conversations outside working hours.
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-border">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Out-of-office reply</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Automatically reply to inbound messages outside your service hours.
            </p>
          </div>
          <Toggle
            on={settings.enabled}
            onChange={(v) => {
              void patch({ enabled: v }).then(() =>
                toastSuccess(v ? "Out-of-office reply on" : "Out-of-office reply off")
              );
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-sm border-b border-border hover:bg-gray-50"
        >
          <span className="text-gray-600 flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded border border-gray-300" aria-hidden />
            Share with other locations
          </span>
          <span className="inline-flex items-center gap-0.5 text-teal-600 font-medium">
            Share <ChevronRight size={16} />
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Service hours</p>
              <button
                type="button"
                onClick={() => setEditHours(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Edit <Pencil size={13} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between text-sm gap-3">
                  <span className="text-gray-700">{DAY_NAMES[h.day]}</span>
                  <span className={h.unavailable ? "text-gray-400" : "text-gray-800"}>
                    {formatHoursRange(h)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Auto-reply message</p>
              <button
                type="button"
                onClick={() => setEditMessage(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Edit <Pencil size={13} />
              </button>
            </div>
            <div className="rounded-lg bg-teal-50 text-teal-900 text-sm px-3 py-2.5 leading-relaxed">
              {settings.auto_reply_message || DEFAULT_MSG}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-sm font-semibold text-gray-900">Custom dates</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Add specific dates like holidays, or occasions when you&apos;re closed or service hours
            are different.
          </p>
          {settings.custom_dates.length > 0 && (
            <ul className="mb-2 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {settings.custom_dates.map((cd) => (
                <li
                  key={cd.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <button
                    type="button"
                    className="text-left min-w-0 flex-1"
                    onClick={() => setEditCustom(cd)}
                  >
                    <span className="font-medium text-gray-900">
                      {cd.date}
                      {cd.label ? ` · ${cd.label}` : ""}
                    </span>
                    <span className="block text-xs text-gray-500">{formatHoursRange(cd)}</span>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline"
                    onClick={() => {
                      const next = settings.custom_dates.filter((c) => c.id !== cd.id);
                      void patch({ custom_dates: next }).then(() =>
                        toastSuccess("Custom date removed")
                      );
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setEditCustom("new")}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            + Add custom date
          </button>
        </div>
      </div>

      {editHours && (
        <ServiceHoursModal
          initial={hours}
          onClose={() => setEditHours(false)}
          onSave={async (next) => {
            await patch({ service_hours: next });
            toastSuccess("Service hours updated");
          }}
        />
      )}

      {editMessage && (
        <AutoReplyMessageModal
          initial={settings.auto_reply_message}
          onClose={() => setEditMessage(false)}
          onSave={async (msg) => {
            await patch({ auto_reply_message: msg });
            toastSuccess("Auto-reply message updated");
          }}
        />
      )}

      {editCustom !== null && (
        <CustomDateModal
          initial={editCustom === "new" ? null : editCustom}
          onClose={() => setEditCustom(null)}
          onSave={async (row) => {
            const rest = settings.custom_dates.filter((c) => c.id !== row.id);
            await patch({ custom_dates: [...rest, row].sort((a, b) => a.date.localeCompare(b.date)) });
            toastSuccess(editCustom === "new" ? "Custom date added" : "Custom date updated");
          }}
        />
      )}

      {shareOpen && (
        <ShareLocationsModal
          selected={settings.shared_location_ids}
          onClose={() => setShareOpen(false)}
          onSave={async (ids) => {
            await patch({ shared_location_ids: ids });
            toastSuccess("Sharing updated");
          }}
        />
      )}
    </div>
  );
}
