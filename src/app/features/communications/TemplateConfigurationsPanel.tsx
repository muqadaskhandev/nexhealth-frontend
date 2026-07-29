import { useEffect, useState } from "react";
import { mapTemplateConfiguration, staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { TemplateConfiguration } from "../../types";

function toTimeInput(value: string) {
  return value.slice(0, 5);
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export function TemplateConfigurationsPanel() {
  const [config, setConfig] = useState<TemplateConfiguration | null>(null);
  const [start, setStart] = useState("06:00");
  const [end, setEnd] = useState("22:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reminder send preview
  const [apptTime, setApptTime] = useState("07:00");
  const [timingValue, setTimingValue] = useState(2);
  const [timingUnit, setTimingUnit] = useState("hour");
  const [preview, setPreview] = useState<{
    send_at: string;
    blocked: boolean;
    reason: string;
  } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Early-morning math
  const [earliestAppt, setEarliestAppt] = useState("08:00");
  const [bufferHours, setBufferHours] = useState(2);
  const [mathResult, setMathResult] = useState<{
    hours_prior: number;
    formula: string;
    explanation: string;
  } | null>(null);
  const [mathLoading, setMathLoading] = useState(false);

  useEffect(() => {
    staffApi.templateConfig
      .get()
      .then((row) => {
        const mapped = mapTemplateConfiguration(row);
        setConfig(mapped);
        setStart(toTimeInput(mapped.sendingHoursStart));
        setEnd(toTimeInput(mapped.sendingHoursEnd));
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const row = await staffApi.templateConfig.update({
        sending_hours_start: toApiTime(start),
        sending_hours_end: toApiTime(end),
      });
      const mapped = mapTemplateConfiguration(row);
      setConfig(mapped);
      toastSuccess("Sending hours saved");
    } catch {
      toastError("Could not save sending hours.");
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setPreviewing(true);
    try {
      const today = new Date();
      const [hh, mm] = apptTime.split(":").map(Number);
      const appointmentAt = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
        hh,
        mm,
        0
      );
      const row = await staffApi.templateConfig.previewReminderSend({
        appointment_at: appointmentAt.toISOString(),
        timing_value: timingValue,
        timing_unit: timingUnit,
        channel: "sms",
      });
      setPreview({
        send_at: row.send_at,
        blocked: row.blocked,
        reason: row.reason,
      });
    } catch {
      toastError("Could not preview reminder send.");
    } finally {
      setPreviewing(false);
    }
  }

  async function runMath() {
    setMathLoading(true);
    try {
      const row = await staffApi.templateConfig.earlyMorningOffset({
        sending_hours_end: toApiTime(end),
        earliest_appointment: toApiTime(earliestAppt),
        buffer_hours: bufferHours,
      });
      setMathResult({
        hours_prior: row.hours_prior,
        formula: row.formula,
        explanation: row.explanation,
      });
    } catch {
      toastError("Could not calculate early-morning offset.");
    } finally {
      setMathLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Template configurations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Automated text messages sent by NexHealth will only be sent between these hours. Text
          messages scheduled for outside these hours will be skipped — they do not queue. Emails
          will continue to be sent.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Sending hours</h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <span className="text-sm text-gray-500">to</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Automated templates will be sent during the selected hours
          {config ? ` (last saved ${new Date(config.updatedAt).toLocaleString()})` : ""}.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-2">
        <p className="font-semibold">Reminders do not send outside of the set hours</p>
        <p>
          Reminders that would have been sent during blocked hours do not queue until a suitable
          time — they <em>just do not go out</em>.
        </p>
        <p className="text-xs">
          For example, if a patient has a 7am appointment, sending hours start at 6am, and the
          Reminder is set to send 2 hours in advance (5am), that Reminder would be{" "}
          <strong>blocked from sending</strong>.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        To change the default sending times for your Reminders, adjust the hours above. These
        settings live under <strong>Settings → Template configurations</strong>.
      </div>

      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Preview: would this Reminder send?</h3>
        <p className="text-xs text-gray-500">
          Check whether an SMS Reminder would be blocked by your current sending hours.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">
            Appointment time
            <input
              type="time"
              value={apptTime}
              onChange={(e) => setApptTime(e.target.value)}
              className="mt-1 block px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            Send
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                min={0}
                value={timingValue}
                onChange={(e) => setTimingValue(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <select
                value={timingUnit}
                onChange={(e) => setTimingUnit(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="hour">hours prior</option>
                <option value="day">days prior</option>
                <option value="week">weeks prior</option>
              </select>
            </div>
          </label>
          <button
            type="button"
            disabled={previewing}
            onClick={runPreview}
            className="px-4 py-2 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 disabled:opacity-50"
          >
            {previewing ? "Checking…" : "Check"}
          </button>
        </div>
        {preview && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              preview.blocked
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p className="font-medium">
              {preview.blocked ? "Blocked from sending" : "Would send"} · scheduled{" "}
              {new Date(preview.send_at).toLocaleString()}
            </p>
            <p className="text-xs mt-1 opacity-90">{preview.reason}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">
          Early-morning Reminders — doing the math
        </h3>
        <p className="text-xs text-gray-500">
          Formula: (Difference between prior evening end of send times and earliest appointment
          time slot) + buffer hours. Use this for Option 3: one Reminder the evening prior for
          early patients, plus a second Reminder closer to the appointment.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">
            Send hours end
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 block px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            Earliest appointment
            <input
              type="time"
              value={earliestAppt}
              onChange={(e) => setEarliestAppt(e.target.value)}
              className="mt-1 block px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <label className="text-xs text-gray-500">
            Buffer (hours)
            <input
              type="number"
              min={0}
              max={24}
              value={bufferHours}
              onChange={(e) => setBufferHours(Number(e.target.value))}
              className="mt-1 block w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </label>
          <button
            type="button"
            disabled={mathLoading}
            onClick={runMath}
            className="px-4 py-2 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 disabled:opacity-50"
          >
            {mathLoading ? "Calculating…" : "Calculate"}
          </button>
        </div>
        {mathResult && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-950 space-y-1">
            <p className="font-medium">Set for {mathResult.hours_prior} hours prior</p>
            <p className="text-xs">{mathResult.formula}</p>
            <p className="text-xs">{mathResult.explanation}</p>
          </div>
        )}
      </div>

      <EarlyMorningOptionsGuide />

      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        If you have reminders configured to send shortly before an appointment (for example, two
        hours before), Reminders will only be sent within the designated time period. Earlier
        appointments may not receive that reminder.
      </div>
    </div>
  );
}

function EarlyMorningOptionsGuide() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-5 text-sm text-gray-700">
      <div>
        <h3 className="font-semibold text-gray-900">How do I send early-morning reminders?</h3>
        <p className="text-xs text-gray-500 mt-1">
          Adjust sending hours or Reminder templates so early appointments still get a message.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-teal-700">Option 1: Configure a closer send time</h4>
          <p className="text-xs text-gray-600 mt-1">
            Change the Reminder send time to be 1 hour before the appointment (edit the gray Next
            action tile on the Reminders template).
          </p>
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            Downside: this means that <strong>all appointments</strong> will receive their Reminders
            only 1 hour before the appointment.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-teal-700">
            Option 2: Adjust template send time hours to start 2 hours before your first appointment
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            Widen sending hours above so SMS can go out earlier (for example, start 2 hours before
            your first appointment slot).
          </p>
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            Downside: this means that <strong>all templates</strong> will send as early as 2 hours
            before your first appointment slot.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-teal-700">Option 3: Plan 2 send times for Reminders</h4>
          <p className="text-xs text-gray-600 mt-1">
            Add a second Reminder timing on the Reminders template (Add Reminder timing):
          </p>
          <ul className="mt-2 list-disc list-inside text-xs text-gray-600 space-y-1">
            <li>
              Set the normal Reminder time for ~14 hours prior if your send window is 12 hours long —
              this reaches early-morning patients the evening before.
            </li>
            <li>Set the extra Reminder time to send 2 hours prior for most other patients.</li>
          </ul>
          <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            For the examples in Help, assume send hours of 6am–6pm. A 7am appointment with a 14-hour
            Reminder receives it at 5pm the previous day; a 4pm appointment with that same 14-hour
            Reminder would be blocked (2am). The 2-hour Reminder covers afternoon appointments (4pm →
            2pm) while early slots may be blocked on that closer timing.
          </p>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="font-semibold text-gray-900 text-sm">FAQ</h4>
        <p className="text-xs font-medium text-gray-800 mt-2">
          Is it possible to send all my reminders first thing in the morning?
        </p>
        <p className="text-xs text-gray-600 mt-1">
          No. Reminders will send in relation to the appointment time; it is not possible for all
          reminders for the day to go out at the same time.
        </p>
      </div>
    </div>
  );
}
