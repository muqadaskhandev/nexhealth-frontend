import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { staffApi } from "../../lib/staff-api";
import type { TemplateConfiguration } from "../../types";
import { reminderContentSupportsConsolidation } from "./smartCommands";

type RuleItem = {
  title: string;
  body: string;
  callout?: string;
  example?: string;
};

type RuleSection = {
  id: string;
  title: string;
  intro?: string;
  items: RuleItem[];
};

type RulesDoc = {
  title: string;
  summary: string;
  consolidation_gate: string;
  sections: RuleSection[];
};

type PreviewGroup = {
  mode: string;
  recipient_phone: string;
  recipient_label: string;
  appointment_ids: string[];
  listed_appointment_ids: string[];
  patient_names: string[];
  notes: string[];
  confirm_applies_to_all: boolean;
};

export function MessageGroupingRulesPanel({
  config,
  reminderContent = "{{INSERTCONFIRMAPPT}} {{APPOINTMENT_REGISTRATION}}",
  compact = false,
}: {
  config?: TemplateConfiguration | null;
  reminderContent?: string;
  compact?: boolean;
}) {
  const [doc, setDoc] = useState<RulesDoc | null>(null);
  const [openId, setOpenId] = useState<string | null>("shared_phone");
  const [previewGroups, setPreviewGroups] = useState<PreviewGroup[] | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{
    consolidation_supported: boolean;
    family_messaging_active: boolean;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    staffApi.messageGrouping
      .rules()
      .then(setDoc)
      .catch(() => setDoc(null));
  }, []);

  const supports = reminderContentSupportsConsolidation(reminderContent);

  async function runPreview() {
    setLoadingPreview(true);
    try {
      const res = await staffApi.messageGrouping.preview({
        template_content: reminderContent,
        family_messaging_enabled: config?.familyMessagingEnabled,
        use_family_messaging_for_reminders: config?.useFamilyMessagingForReminders,
        appointment_journeys_enabled: config?.customizeByAppointmentType,
      });
      setPreviewGroups(res.groups);
      setPreviewMeta({
        consolidation_supported: res.consolidation_supported,
        family_messaging_active: res.family_messaging_active,
      });
    } catch {
      setPreviewGroups([]);
      setPreviewMeta(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  if (!doc) {
    return (
      <div className="rounded-xl border border-border bg-white px-5 py-4 text-sm text-gray-400">
        Loading message grouping rules…
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${compact ? "max-w-2xl" : "max-w-3xl"}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{doc.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{doc.summary}</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {doc.consolidation_gate}
      </div>

      {!supports && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          This Reminder content is missing{" "}
          <code className="text-xs bg-white/70 px-1 rounded">INSERTCONFIRMAPPT</code> or{" "}
          <code className="text-xs bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code>.
          Appointment details will not be consolidated until one of those smart commands is added.
        </div>
      )}

      <div className="space-y-2">
        {doc.sections.map((section) => {
          const open = openId === section.id;
          return (
            <div key={section.id} className="bg-white rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : section.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
              >
                {open ? (
                  <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                )}
                <span className="font-semibold text-gray-900 text-sm">{section.title}</span>
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
                  {section.intro && <p className="text-sm text-gray-600">{section.intro}</p>}
                  {section.items.map((item) => (
                    <div key={item.title} className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                      {item.callout && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                          {item.callout}
                        </div>
                      )}
                      {item.example && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                          {item.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-border px-4 py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Preview today’s grouping</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Uses this location’s appointments for today and current family-messaging settings.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingPreview}
            onClick={() => void runPreview()}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            {loadingPreview ? "Running…" : "Run preview"}
          </button>
        </div>
        {previewMeta && (
          <p className="text-xs text-gray-500">
            Consolidation {previewMeta.consolidation_supported ? "on" : "off"} · Family messaging
            for reminders {previewMeta.family_messaging_active ? "on" : "off"}
          </p>
        )}
        {previewGroups && previewGroups.length === 0 && (
          <p className="text-sm text-gray-400">No appointments found for today to group.</p>
        )}
        {previewGroups && previewGroups.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {previewGroups.map((g, i) => (
              <li key={`${g.recipient_label}-${i}`} className="px-3 py-3 text-sm space-y-1 bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-gray-900">{g.recipient_label}</span>
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">{g.mode}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {g.patient_names.join(", ") || "—"} · {g.appointment_ids.length} appointment
                  {g.appointment_ids.length === 1 ? "" : "s"}
                  {g.listed_appointment_ids.length < g.appointment_ids.length
                    ? ` (lists ${g.listed_appointment_ids.length} in details)`
                    : ""}
                </p>
                {g.notes.slice(0, 2).map((n) => (
                  <p key={n} className="text-xs text-gray-600">
                    {n}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
