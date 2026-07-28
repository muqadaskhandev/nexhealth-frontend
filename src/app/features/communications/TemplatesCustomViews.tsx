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
import { MessageGroupingRulesPanel } from "./MessageGroupingRulesPanel";

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
  const [ageDraft, setAgeDraft] = useState("");
  const on = !!config?.customizeByAppointmentType;
  const familyOn = !!config?.familyMessagingEnabled;
  const familyRemindersOn = !!config?.useFamilyMessagingForReminders;

  useEffect(() => {
    setAgeDraft(
      config?.familyMessagingAgeLimit == null ? "" : String(config.familyMessagingAgeLimit)
    );
  }, [config?.familyMessagingAgeLimit]);

  async function patchConfig(
    body: Parameters<typeof staffApi.templateConfig.update>[0],
    success: string
  ) {
    setSaving(true);
    try {
      const row = await staffApi.templateConfig.update(body);
      onConfigChange(mapTemplateConfiguration(row));
      toastSuccess(success);
    } catch {
      toastError("Could not update setting.");
    } finally {
      setSaving(false);
    }
  }

  async function setCustomize(next: boolean) {
    await patchConfig(
      { customize_by_appointment_type: next },
      next
        ? "Customize by appointment type enabled"
        : "Customize by appointment type disabled"
    );
  }

  async function setFamilyMessaging(next: boolean) {
    await patchConfig(
      { family_messaging_enabled: next },
      next ? "Family messaging enabled" : "Family messaging disabled"
    );
  }

  async function setFamilyReminders(next: boolean) {
    await patchConfig(
      { use_family_messaging_for_reminders: next },
      next
        ? "Family messaging for Reminders enabled"
        : "Family messaging for Reminders disabled"
    );
  }

  async function saveAgeLimit() {
    const trimmed = ageDraft.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value != null && (!Number.isInteger(value) || value < 0 || value > 120)) {
      toastError("Enter a whole age between 0 and 120, or leave blank.");
      return;
    }
    await patchConfig(
      { family_messaging_age_limit: value },
      "Messaging age limit saved"
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Enable family messaging</h2>
        <p className="text-sm text-gray-500 mt-1">
          When family messaging is enabled, Reminders for multiple family members scheduled on the
          same day are condensed into a single message to the guarantor, head of household, or
          responsible party. If that person does not have valid contact information, the Reminder
          will not be sent.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        This feature is especially beneficial for practices that serve many pediatric patients.
      </div>

      <div className="bg-white rounded-xl border border-border px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Family messaging</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Can be set institution-wide or by location. Adjust the messaging age limit below.
          </p>
        </div>
        <Toggle
          on={familyOn}
          disabled={saving || !config}
          onChange={setFamilyMessaging}
        />
      </div>

      {familyOn && (
        <>
          <div className="bg-white rounded-xl border border-border px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  Use Family Messaging for Reminders
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Turn on at the location level once family messaging is enabled. Requires
                  Setup-level permissions (Settings → Roles and permissions) to access Templates →
                  Settings.
                </p>
              </div>
              <Toggle
                on={familyRemindersOn}
                disabled={saving || !config}
                onChange={setFamilyReminders}
              />
            </div>
            <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
              <li>Go to Templates → Settings.</li>
              <li>Toggle on Use Family Messaging for Reminders.</li>
            </ol>
          </div>

          <div className="bg-white rounded-xl border border-border px-5 py-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Messaging age limit
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Optional. Leave blank for no age limit.
              </p>
              <input
                type="number"
                min={0}
                max={120}
                value={ageDraft}
                onChange={(e) => setAgeDraft(e.target.value)}
                placeholder="e.g. 18"
                className="w-full max-w-[8rem] px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveAgeLimit}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
            >
              Save
            </button>
          </div>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
            Family messaging is supported for the following health record systems: Athena, Cloud9,
            Dentrix, Dolphin, eCW, Open Dental, Orthotrac, Eaglesoft, Curve, Dentrix Ascend,
            Denticon, PracticeWorks, Dentrix Enterprise, and ModMed.
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 space-y-2">
            <p className="font-semibold text-gray-900">Example with NexHealth Reminders</p>
            <p>
              Family Messaging combines reminder messages so the head of household or guarantor
              receives a single reminder when multiple family members have appointments on the same
              day. When they reply to confirm, NexHealth confirms{" "}
              <span className="font-semibold">all</span> appointments listed.
            </p>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 space-y-2">
            <p>
              <span className="font-semibold">Unsubscribing applies to all patients sharing the
              same phone number.</span>{" "}
              When one patient unsubscribes, the entire phone number is unsubscribed to comply with
              TCPA regulations. If the number is resubscribed, all linked profiles are re-opted in
              collectively.
            </p>
            <p>
              If a response confirms one patient but declines another, update confirmation status
              manually in your practice management system and contact the head of household to
              reschedule.{" "}
              <span className="font-semibold">
                NexHealth cannot process more than one type of response — it will confirm all Y or
                all N.
              </span>
            </p>
          </div>

          <p className="text-sm text-gray-500">
            In production, enable family messaging with{" "}
            <a
              href="mailto:support@nexhealth.com"
              className="text-teal-600 hover:underline font-medium"
            >
              Support
            </a>
            . This demo lets you turn it on for the current location.
          </p>
        </>
      )}

      {!familyOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          The Settings menu and the <span className="font-semibold">Use Family Messaging for
          Reminders</span> option only appear if family messaging has been enabled.
        </div>
      )}

      <div className="border-t border-border pt-8">
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

      <div className="border-t border-border pt-8">
        <MessageGroupingRulesPanel config={config} />
      </div>
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
          Reminder details are only consolidated when{" "}
          <code className="text-xs bg-white/70 px-1 rounded">INSERTCONFIRMAPPT</code> or{" "}
          <code className="text-xs bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code> is in
          the Reminder content. Open the Reminder template → Message grouping for full rules
          (shared phone, family messaging, 30-minute same-day clusters, and 6-hour other-template
          dedupe).
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
