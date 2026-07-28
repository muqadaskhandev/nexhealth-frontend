import { useEffect, useState } from "react";
import { mapTemplateConfiguration, staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { TemplateConfiguration } from "../../types";

function toTimeInput(value: string) {
  // Backend may return "06:00:00" or "06:00"
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

  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Template configurations</h2>
        <p className="text-sm text-gray-500 mt-1">
          Automated text messages sent by NexHealth will only be sent between these hours. Text
          messages scheduled for outside these hours will be skipped. Emails will continue to be
          sent.
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

      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        If you have reminders configured to send shortly before an appointment (for example, two
        hours before), Reminders will only be sent within the designated time period. Earlier
        appointments may not receive that reminder.
      </div>
    </div>
  );
}
