import { useEffect, useState } from "react";
import { Toggle } from "../../components/shared/Toggle";
import {
  mapTemplateAppointmentTypeStatus,
  mapTemplateConfiguration,
  staffApi,
} from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type {
  CommunicationTemplate,
  TemplateAppointmentTypeStatus,
  TemplateConfiguration,
} from "../../types";
import { TemplatesListView } from "./TemplatesListView";
import { TemplateConfigurationsPanel } from "./TemplateConfigurationsPanel";

/** Template types that support per-appointment-type sequences. */
export const CUSTOMIZABLE_TEMPLATE_SLUGS = [
  { slug: "reminders", label: "Reminders" },
  { slug: "post-appointment-follow-up", label: "Post Appointment Follow-up" },
  { slug: "recalls", label: "Recalls" },
  { slug: "appointment-request", label: "Appointment Request" },
  { slug: "appointment-confirmed", label: "Appointment Confirmed" },
  { slug: "save-the-date", label: "Save the Date" },
] as const;

export function TemplatesSettingsTab({
  config,
  onConfigChange,
}: {
  config: TemplateConfiguration | null;
  onConfigChange: (c: TemplateConfiguration) => void;
}) {
  const [saving, setSaving] = useState(false);
  const on = !!config?.customizeByAppointmentType;

  async function setCustomize(next: boolean) {
    setSaving(true);
    try {
      const row = await staffApi.templateConfig.update({
        customize_by_appointment_type: next,
      });
      onConfigChange(mapTemplateConfiguration(row));
      toastSuccess(
        next
          ? "Customize by appointment type enabled"
          : "Customize by appointment type disabled"
      );
    } catch {
      toastError("Could not update setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Appointment Journeys</h2>
        <p className="text-sm text-gray-500 mt-1">
          Build appointment-specific messages customized by appointment type. Requires appointment
          types and mapping rules under Scheduling.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Customize templates by appointment type</p>
          <p className="text-xs text-gray-500 mt-0.5">
            When on, use the Custom tab to enable and edit sequences per appointment type.
          </p>
        </div>
        <Toggle on={on} disabled={saving || !config} onChange={setCustomize} />
      </div>

      <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900 space-y-1">
        <p className="font-medium">Before enabling</p>
        <ol className="list-decimal list-inside text-teal-800/90 space-y-0.5">
          <li>Create appointment types in Online booking → Appointment types.</li>
          <li>Create mapping rules so EHR appointments map to NexHealth types.</li>
          <li>Toggle this setting on, then build sequences under Custom.</li>
        </ol>
      </div>

      <TemplateConfigurationsPanel />
    </div>
  );
}

export function TemplatesCustomTab({
  enabled,
  onOpenTemplate,
}: {
  enabled: boolean;
  onOpenTemplate: (templateId: string) => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>("reminders");
  const [rows, setRows] = useState<TemplateAppointmentTypeStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  function refresh(slug: string) {
    setLoading(true);
    staffApi.communicationTemplates
      .appointmentTypes(slug)
      .then((data) => setRows(data.map(mapTemplateAppointmentTypeStatus)))
      .catch(() => {
        setRows([]);
        toastError("Could not load appointment types for this template.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!enabled) return;
    refresh(selectedSlug);
  }, [enabled, selectedSlug]);

  async function toggleType(row: TemplateAppointmentTypeStatus, next: boolean) {
    setSavingId(row.appointmentTypeId);
    try {
      const result = await staffApi.communicationTemplates.setVariant(
        selectedSlug,
        row.appointmentTypeId,
        next
      );
      refresh(selectedSlug);
      if (next && result) {
        toastSuccess(`Custom sequence enabled for ${row.appointmentTypeName}`);
      } else {
        toastSuccess(`Custom sequence disabled for ${row.appointmentTypeName}`);
      }
    } catch {
      toastError("Could not update appointment type sequence.");
    } finally {
      setSavingId(null);
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center max-w-lg">
        <p className="text-sm font-medium text-gray-700">Customization is off</p>
        <p className="text-sm text-gray-400 mt-1">
          Go to Settings and turn on “Customize templates by appointment type”.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Build by appointment type</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select a template type, enable appointment types that need a custom sequence, then open a
          sequence to edit, preview, and activate.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Template type</label>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
        >
          {CUSTOMIZABLE_TEMPLATE_SLUGS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-gray-900">Customize Appointment Types</h3>
          <p className="text-xs text-gray-500 mt-1">
            Create a new sequence for any appointment type that does not have this sequence enabled.
          </p>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-500">No appointment types yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Create them under Scheduling → Online booking → Appointment types.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.appointmentTypeId}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50/80"
              >
                <button
                  type="button"
                  disabled={!row.enabled || !row.variantId}
                  onClick={() => row.variantId && onOpenTemplate(row.variantId)}
                  className={`text-sm text-left truncate ${
                    row.enabled && row.variantId
                      ? "text-teal-700 font-medium hover:underline"
                      : "text-gray-700"
                  }`}
                >
                  {row.appointmentTypeName}
                </button>
                <Toggle
                  on={row.enabled}
                  disabled={savingId === row.appointmentTypeId}
                  onChange={(v) => toggleType(row, v)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedSlug === "reminders" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          When editing Reminders, leave the{" "}
          <code className="text-xs bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code> smart
          command intact so patients can confirm appointments. If Smart Form Automation is
          configured, required forms are sent automatically.
        </div>
      )}
    </div>
  );
}

/** Thin wrapper kept for TemplatesSection settings area that embeds sending hours. */
export function TemplatesHubList({
  onOpen,
}: {
  onOpen: (t: CommunicationTemplate) => void;
}) {
  return <TemplatesListView onOpen={onOpen} />;
}
