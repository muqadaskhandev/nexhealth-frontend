import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Clock,
  Mail,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import {
  mapCommunicationTemplate,
  mapTemplateConfiguration,
  staffApi,
} from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type {
  CommunicationTemplate,
  CommunicationTemplateStep,
  TemplateConfiguration,
} from "../../types";
import { applySmartCommandPreview, reminderContentSupportsConsolidation } from "./smartCommands";
import { SmartCommandsPanel } from "./SmartCommandsPanel";
import { MessageGroupingRulesPanel } from "./MessageGroupingRulesPanel";
import { TemplateHistoryPanel } from "./TemplateHistoryPanel";
import { RemindersHelpPanel } from "./RemindersHelpPanel";

type DetailTab = "actions" | "grouping" | "performance" | "history" | "help";
type EditTarget =
  | { kind: "trigger" | "message"; step: CommunicationTemplateStep }
  | null;

type SendConditionKey = "confirmed" | "unconfirmed" | "either";

const SEND_CONDITION_OPTIONS: {
  key: SendConditionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "unconfirmed",
    label: "Send if unconfirmed",
    description:
      "Send a message specifically for patients who have not yet confirmed their appointment.",
  },
  {
    key: "confirmed",
    label: "Send if confirmed",
    description: "Send a message specifically for patients who have already confirmed their appointment.",
  },
  {
    key: "either",
    label: "Send if confirmed or unconfirmed",
    description: "Send the same message to patients regardless of their confirmation status.",
  },
];

function conditionLabelFor(key: SendConditionKey): string {
  return SEND_CONDITION_OPTIONS.find((o) => o.key === key)?.label ?? "Send if unconfirmed";
}

function conditionKeyFromLabel(label: string | null | undefined): SendConditionKey {
  if (!label) return "either";
  const lowered = label.toLowerCase();
  if (lowered.includes("unconfirmed") && lowered.includes("confirmed") && lowered.includes("or")) {
    return "either";
  }
  if (lowered.includes("unconfirmed")) return "unconfirmed";
  if (lowered.includes("confirmed")) return "confirmed";
  return "either";
}

function stepSendCondition(
  step: CommunicationTemplateStep,
  trigger: CommunicationTemplateStep | undefined
): SendConditionKey {
  const raw = step.meta?.send_condition;
  if (raw === "confirmed" || raw === "unconfirmed" || raw === "either") return raw;
  if (step.conditionLabel) return conditionKeyFromLabel(step.conditionLabel);
  return conditionKeyFromLabel(trigger?.conditionLabel);
}

export function TemplateDetailView({
  templateId,
  onBack,
  onTemplateReplaced,
}: {
  templateId: string;
  onBack: () => void;
  onTemplateReplaced?: (id: string) => void;
}) {
  const [template, setTemplate] = useState<CommunicationTemplate | null>(null);
  const [config, setConfig] = useState<TemplateConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("actions");
  const [edit, setEdit] = useState<EditTarget>(null);
  const [confirmActivate, setConfirmActivate] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showAddSequence, setShowAddSequence] = useState(false);
  const [copying, setCopying] = useState(false);

  function refresh() {
    return staffApi.communicationTemplates
      .get(templateId)
      .then((row) => setTemplate(mapCommunicationTemplate(row)));
  }

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    staffApi.templateConfig
      .get()
      .then((row) => setConfig(mapTemplateConfiguration(row)))
      .catch(() => setConfig(null));
  }, [templateId]);

  async function setActive(next: boolean) {
    if (!template) return;
    setSaving(true);
    try {
      const row = await staffApi.communicationTemplates.update(template.id, {
        is_active: next,
      });
      setTemplate(mapCommunicationTemplate(row));
      toastSuccess(next ? "Template activated" : "Template deactivated");
    } catch {
      toastError("Could not update template status.");
    } finally {
      setSaving(false);
      setConfirmActivate(null);
    }
  }

  async function saveStep(patch: {
    title?: string;
    subtitle?: string;
    body?: string;
    subject?: string;
    timing_value?: number | null;
    timing_unit?: string | null;
    condition_label?: string | null;
    meta?: Record<string, unknown>;
  }) {
    if (!template || !edit) return;
    setSaving(true);
    try {
      await staffApi.communicationTemplates.updateStep(template.id, edit.step.id, patch);
      await refresh();
      toastSuccess("Step saved");
      setEdit(null);
    } catch {
      toastError("Could not save step.");
    } finally {
      setSaving(false);
    }
  }

  async function addStep(
    kind: "email" | "sms",
    opts?: { sendCondition?: SendConditionKey; title?: string }
  ) {
    if (!template) return;
    const sendCondition = opts?.sendCondition;
    try {
      await staffApi.communicationTemplates.addStep(template.id, {
        kind,
        title:
          opts?.title ||
          (kind === "email"
            ? sendCondition
              ? `Reminders Email (${conditionLabelFor(sendCondition)})`
              : "New Email"
            : sendCondition
              ? `Reminders SMS (${conditionLabelFor(sendCondition)})`
              : "New SMS"),
        body:
          kind === "sms"
            ? "Hi {{PATIENT_FIRST_NAME}}, reminder for your appointment at {{LOCATION_NAME}} on {{APPOINTMENT_DATE}}.\n\n{{INSERTCONFIRMAPPT}}\n{{APPOINTMENT_REGISTRATION}}"
            : "We look forward to seeing you soon, {{PATIENT_FIRST_NAME}}!\n\n{{CONFIRM_APPOINTMENT}}\n{{APPOINTMENT_REGISTRATION}}",
        subject: kind === "email" ? "Your appointment with {{LOCATION_NAME}} is coming up" : "",
        condition_label: sendCondition ? conditionLabelFor(sendCondition) : undefined,
        meta: sendCondition ? { send_condition: sendCondition } : {},
      });
      await refresh();
      toastSuccess("Step added");
      setShowAddSequence(false);
    } catch {
      toastError("Could not add step.");
    }
  }

  async function addReminderTiming(timingValue = 2, timingUnit = "hour") {
    if (!template) return;
    try {
      await staffApi.communicationTemplates.addStep(template.id, {
        kind: "trigger",
        title: "Next action",
        subtitle: `${timingValue} ${timingUnit} Reminders`,
        timing_value: timingValue,
        timing_unit: timingUnit,
        condition_label: "Send if unconfirmed",
      });
      await staffApi.communicationTemplates.addStep(template.id, {
        kind: "sms",
        title: "Reminders SMS",
        body:
          "Hi {{PATIENT_FIRST_NAME}}, reminder: your appointment at {{LOCATION_NAME}} " +
          "is on {{APPOINTMENT_DATE}} at {{APPOINTMENT_TIME}}.\n\n{{INSERTCONFIRMAPPT}}\n{{APPOINTMENT_REGISTRATION}}",
        condition_label: "Send if unconfirmed",
        meta: { send_condition: "unconfirmed" },
      });
      await refresh();
      toastSuccess("Added second Reminder timing — edit the Next action tile to fine-tune hours prior");
    } catch {
      toastError("Could not add Reminder timing.");
    }
  }

  async function removeStep(stepId: string) {
    if (!template) return;
    try {
      await staffApi.communicationTemplates.deleteStep(template.id, stepId);
      await refresh();
      setEdit(null);
      toastSuccess("Step removed");
    } catch {
      toastError("Could not remove step.");
    }
  }

  async function copyForThisLocation() {
    if (!template) return;
    setCopying(true);
    try {
      const row = await staffApi.communicationTemplates.copyForLocation(template.id);
      const mapped = mapCommunicationTemplate(row);
      toastSuccess("Created a copy for this location only");
      if (onTemplateReplaced) onTemplateReplaced(mapped.id);
      else setTemplate(mapped);
    } catch {
      toastError("Could not copy template for this location.");
    } finally {
      setCopying(false);
    }
  }

  const triggers = (template?.steps.filter((s) => s.kind === "trigger") ?? []).sort(
    (a, b) => a.position - b.position
  );
  const trigger = triggers[0];
  const messages = template?.steps.filter((s) => s.kind === "email" || s.kind === "sms") ?? [];
  const reminderBodies = messages.map((m) => `${m.body || ""}\n${m.subject || ""}`).join("\n");
  const consolidates = reminderContentSupportsConsolidation(reminderBodies);
  const branchKeys = Array.from(new Set(messages.map((m) => stepSendCondition(m, trigger))));
  const isBranched = branchKeys.length > 1;

  /** Group messages under the preceding trigger by position (supports dual Reminder timings). */
  const timingBlocks = triggers.map((trig, idx) => {
    const nextPos = triggers[idx + 1]?.position ?? Number.POSITIVE_INFINITY;
    const blockMessages = messages
      .filter((m) => m.position > trig.position && m.position < nextPos)
      .sort((a, b) => a.position - b.position);
    return { trigger: trig, messages: blockMessages };
  });
  // Orphan messages before first trigger (shouldn't happen) append to first block
  const orphanMessages = messages.filter(
    (m) => !triggers.length || m.position < (triggers[0]?.position ?? 0)
  );

  if (loading || !template) {
    return (
      <div className="px-6 py-5">
        <p className="text-sm text-gray-400">Loading template…</p>
      </div>
    );
  }

  const tabCls = (active: boolean) =>
    `px-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-gray-900 text-gray-900"
        : "border-transparent text-gray-400 hover:text-gray-600"
    }`;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-white space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft size={14} /> Back to templates
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            {template.appointmentTypeName && (
              <p className="text-sm text-teal-700 font-medium mt-1">
                Appointment type: {template.appointmentTypeName}
              </p>
            )}
            {template.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">{template.description}</p>
            )}
            {template.slug === "reminders" && (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-xs max-w-2xl ${
                  consolidates
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {consolidates ? (
                  <>
                    When editing the text of your reminders, be sure to leave the{" "}
                    <code className="bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code> (or{" "}
                    <code className="bg-white/70 px-1 rounded">INSERTCONFIRMAPPT</code>) smart command
                    intact to allow patients to confirm their appointments from the message. If you have
                    Smart Form Automation configured, the appropriate forms will automatically be sent to
                    the patient.
                  </>
                ) : (
                  <>
                    Add <code className="bg-white/70 px-1 rounded">INSERTCONFIRMAPPT</code> or{" "}
                    <code className="bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code> to
                    Reminder content. Without them, appointment details are not consolidated and patients
                    cannot confirm from the message.
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Toggle ON to send template</span>
            <Toggle
              on={template.isActive}
              disabled={saving}
              onChange={(v) => setConfirmActivate(v)}
            />
          </div>
        </div>

        {template.multiLocation && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-3">
            <span>
              Heads up! This template is in use by multiple locations. Any changes you make will affect all
              of those locations using this template.
            </span>
            <button
              type="button"
              disabled={copying}
              onClick={copyForThisLocation}
              className="shrink-0 text-sm font-semibold text-teal-700 hover:text-teal-800 underline disabled:opacity-50"
            >
              {copying ? "Copying…" : "Copy and edit template for only this location"}
            </button>
          </div>
        )}

        <div className="flex items-center gap-5 border-b border-border -mb-px overflow-x-auto">
          <button type="button" className={tabCls(tab === "actions")} onClick={() => setTab("actions")}>
            Actions
          </button>
          {template.slug === "reminders" && (
            <button
              type="button"
              className={tabCls(tab === "grouping")}
              onClick={() => setTab("grouping")}
            >
              Message grouping
            </button>
          )}
          <button
            type="button"
            className={tabCls(tab === "performance")}
            onClick={() => setTab("performance")}
          >
            Performance
          </button>
          <button
            type="button"
            className={tabCls(tab === "history")}
            onClick={() => setTab("history")}
          >
            History
          </button>
          {template.slug === "reminders" && (
            <button type="button" className={tabCls(tab === "help")} onClick={() => setTab("help")}>
              Help & FAQ
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {tab === "actions" && (
            <div className={`mx-auto space-y-0 ${isBranched ? "max-w-3xl" : "max-w-md"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4 text-center">
                Action — what causes the template to send
              </p>

              {template.slug === "reminders" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 mb-4">
                  <strong>Reminders do not send outside of set hours</strong> — blocked reminders do not
                  queue; they just do not go out. For early-morning appointments, use a closer timing,
                  widen sending hours under Settings → Template configurations, or add a second Reminder
                  timing (evening-prior + hours-prior).
                </div>
              )}

              {timingBlocks.map((block, blockIdx) => {
                const blockBranchKeys = Array.from(
                  new Set(block.messages.map((m) => stepSendCondition(m, block.trigger)))
                );
                const blockBranched = blockBranchKeys.length > 1;
                const canRemoveTrigger = triggers.length > 1;
                return (
                  <div key={block.trigger.id} className="mb-8">
                    {blockIdx > 0 && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 text-center">
                        Extra Reminder timing
                      </p>
                    )}
                    <SequenceTile
                      step={block.trigger}
                      onEdit={() => setEdit({ kind: "trigger", step: block.trigger })}
                      onDelete={
                        canRemoveTrigger ? () => removeStep(block.trigger.id) : undefined
                      }
                    />

                    <div className="flex justify-center py-2">
                      <div className="rounded-full bg-white border border-border px-3 py-1.5 text-xs text-gray-600 shadow-sm flex flex-wrap items-center justify-center gap-1">
                        <span>{block.trigger.conditionLabel || "Send if unconfirmed"}</span>
                        {blockIdx === 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddSequence(true)}
                            className="text-teal-600 font-medium ml-1 hover:text-teal-700"
                          >
                            + Add additional sequence
                          </button>
                        )}
                      </div>
                    </div>

                    {blockIdx === 0 && template.slug === "reminders" && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 mb-3">
                        With the{" "}
                        <code className="bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code>{" "}
                        smart command, if you want patients who have already confirmed to receive a
                        reminder for their forms, set the action to{" "}
                        <strong>Send if confirmed or unconfirmed</strong>.
                      </div>
                    )}

                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 text-center pt-2">
                      Email / SMS messages
                    </p>

                    {blockBranched ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {blockBranchKeys.map((key) => {
                          const branchMessages = block.messages.filter(
                            (m) => stepSendCondition(m, block.trigger) === key
                          );
                          return (
                            <div
                              key={key}
                              className="rounded-xl border border-border bg-gray-50/60 p-3 space-y-2"
                            >
                              <div className="text-center text-xs font-semibold text-gray-600 px-2 py-1.5 rounded-lg bg-white border border-border">
                                {conditionLabelFor(key)}
                              </div>
                              {branchMessages.map((step, i) => (
                                <div key={step.id}>
                                  <SequenceTile
                                    step={step}
                                    onEdit={() => setEdit({ kind: "message", step })}
                                  />
                                  {i < branchMessages.length - 1 && <Connector />}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {(blockIdx === 0 ? [...orphanMessages, ...block.messages] : block.messages).map(
                          (step, i, arr) => (
                            <div key={step.id}>
                              <SequenceTile
                                step={step}
                                onEdit={() => setEdit({ kind: "message", step })}
                              />
                              {i < arr.length - 1 && <Connector />}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-center pt-2 gap-3 flex-wrap">
                <div className="relative group">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center shadow-sm"
                    title="Add another sequence"
                  >
                    <Plus size={16} />
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col gap-1 bg-white border border-border rounded-lg shadow-lg p-1 z-10 min-w-[160px]">
                    <button
                      type="button"
                      onClick={() => addStep("email")}
                      className="px-3 py-1.5 text-sm text-left hover:bg-gray-50 rounded-md"
                    >
                      Add Email
                    </button>
                    <button
                      type="button"
                      onClick={() => addStep("sms")}
                      className="px-3 py-1.5 text-sm text-left hover:bg-gray-50 rounded-md"
                    >
                      Add SMS
                    </button>
                    {template.slug === "reminders" && (
                      <button
                        type="button"
                        onClick={() => addReminderTiming(2, "hour")}
                        className="px-3 py-1.5 text-sm text-left hover:bg-gray-50 rounded-md"
                      >
                        Add Reminder timing
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-teal-600 mt-2">
                {template.slug === "reminders"
                  ? "Add another sequence or Reminder timing (e.g. 14h prior + 2h prior)"
                  : "Add another sequence"}
              </p>

              {template.slug === "reminders" && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => addReminderTiming(14, "hour")}
                    className="text-sm font-medium text-teal-700 hover:text-teal-800 underline"
                  >
                    + Add early-morning Reminder set (14 hours prior)
                  </button>
                </div>
              )}

              {template.slug === "reminders" && (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  You can also configure your reminders in other languages. Prefer communicating with
                  patients in their preferred language when translations are available. Sending hours
                  and early-morning math live in Settings → Template configurations.
                </div>
              )}
            </div>
          )}

          {tab === "grouping" && (
            <MessageGroupingRulesPanel config={config} reminderContent={reminderBodies} />
          )}

          {tab === "performance" && (
            <div className="max-w-lg mx-auto text-center py-16">
              <p className="text-sm text-gray-500">
                {template.totalSent} messages sent to {template.recipients} recipients.
              </p>
              <p className="text-xs text-gray-400 mt-2">Detailed performance metrics coming soon.</p>
            </div>
          )}

          {tab === "history" && <TemplateHistoryPanel templateId={template.id} />}

          {tab === "help" && <RemindersHelpPanel />}
        </div>

        {edit && (
          <StepEditorPanel
            step={edit.step}
            isMessage={edit.kind === "message"}
            templateSlug={template.slug}
            preview={preview}
            setPreview={setPreview}
            saving={saving}
            onClose={() => {
              setEdit(null);
              setPreview(false);
            }}
            onSave={saveStep}
            onDelete={
              edit.kind === "message" ||
              (edit.kind === "trigger" && triggers.length > 1)
                ? () => removeStep(edit.step.id)
                : undefined
            }
          />
        )}
      </div>

      {confirmActivate !== null && (
        <ConfirmModal
          title={confirmActivate ? "Activate template?" : "Deactivate template?"}
          message={
            confirmActivate
              ? "Reminders will begin going out immediately. Patients will start receiving this automated sequence. Continue?"
              : "This template will stop sending until you turn it back on. If you want to stop all reminders from being sent to any patients, toggle off the reminder template."
          }
          confirmLabel="Yes"
          submitting={saving}
          onConfirm={() => setActive(confirmActivate)}
          onCancel={() => setConfirmActivate(null)}
        />
      )}

      {showAddSequence && (
        <AddSequenceModal
          onClose={() => setShowAddSequence(false)}
          onSelect={(condition, kind) => addStep(kind, { sendCondition: condition })}
        />
      )}
    </div>
  );
}

function AddSequenceModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (condition: SendConditionKey, kind: "email" | "sms") => void;
}) {
  const [condition, setCondition] = useState<SendConditionKey>("confirmed");
  const [kind, setKind] = useState<"email" | "sms">("sms");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-gray-900">Add additional sequence</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Send condition
            </p>
            <div className="space-y-2">
              {SEND_CONDITION_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={`flex gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${
                    condition === opt.key
                      ? "border-teal-400 bg-teal-50/50"
                      : "border-border hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="send-condition"
                    checked={condition === opt.key}
                    onChange={() => setCondition(opt.key)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{opt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Messaging</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKind("sms")}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  kind === "sms" ? "border-teal-400 bg-teal-50 text-teal-800" : "border-border text-gray-600"
                }`}
              >
                <Smartphone size={16} /> SMS
              </button>
              <button
                type="button"
                onClick={() => setKind("email")}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  kind === "email"
                    ? "border-teal-400 bg-teal-50 text-teal-800"
                    : "border-border text-gray-600"
                }`}
              >
                <Mail size={16} /> Email
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
            <Bell size={14} className="text-gray-400 shrink-0" />
            Selecting both Send if confirmed and Send if unconfirmed creates a branch in your sequence.
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelect(condition, kind)}
            className="px-4 py-1.5 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg"
          >
            Add sequence
          </button>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return <div className="w-px h-5 bg-gray-200 mx-auto" />;
}

function SequenceTile({
  step,
  onEdit,
  onDelete,
}: {
  step: CommunicationTemplateStep;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const isTrigger = step.kind === "trigger";
  const Icon = step.kind === "email" ? Mail : step.kind === "sms" ? Smartphone : Clock;

  return (
    <div
      className={`relative group rounded-xl border bg-white px-5 py-4 shadow-sm ${
        isTrigger ? "border-gray-200" : "border-indigo-100"
      }`}
    >
      <div className="flex flex-col items-center text-center gap-2">
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isTrigger ? "bg-gray-100 text-gray-500" : "bg-indigo-100 text-indigo-600"
          }`}
        >
          <Icon size={18} />
        </span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
          {step.subtitle && <p className="text-xs text-gray-500 mt-0.5">{step.subtitle}</p>}
          {step.conditionLabel && !isTrigger && (
            <p className="text-[11px] text-teal-700 mt-1">{step.conditionLabel}</p>
          )}
        </div>
      </div>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-gray-400 hover:text-teal-600 hover:bg-teal-50"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

function StepEditorPanel({
  step,
  isMessage,
  templateSlug,
  preview,
  setPreview,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  step: CommunicationTemplateStep;
  isMessage: boolean;
  templateSlug: string;
  preview: boolean;
  setPreview: (v: boolean) => void;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(step.title);
  const [subtitle, setSubtitle] = useState(step.subtitle);
  const [body, setBody] = useState(step.body);
  const [subject, setSubject] = useState(step.subject);
  const [timingValue, setTimingValue] = useState(step.timingValue ?? 1);
  const [timingUnit, setTimingUnit] = useState(step.timingUnit ?? "day");
  const [sendCondition, setSendCondition] = useState<SendConditionKey>(
    conditionKeyFromLabel(step.conditionLabel) ||
      (step.meta?.send_condition as SendConditionKey) ||
      "unconfirmed"
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [insertTarget, setInsertTarget] = useState<"body" | "subject">("body");

  useEffect(() => {
    setTitle(step.title);
    setSubtitle(step.subtitle);
    setBody(step.body);
    setSubject(step.subject);
    setTimingValue(step.timingValue ?? 1);
    setTimingUnit(step.timingUnit ?? "day");
    setSendCondition(
      (step.meta?.send_condition as SendConditionKey) ||
        conditionKeyFromLabel(step.conditionLabel) ||
        "unconfirmed"
    );
    setPreview(false);
  }, [step.id]);

  const smsLimit = 425;
  const isSms = step.kind === "sms";

  function insertSmartCommand(wrapped: string) {
    if (preview) return;

    if (insertTarget === "subject" && step.kind === "email") {
      const el = subjectRef.current;
      if (!el) {
        setSubject((s) => s + wrapped);
        return;
      }
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? start;
      const next = subject.slice(0, start) + wrapped + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + wrapped.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }

    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + wrapped);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? start;
    const next = body.slice(0, start) + wrapped + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + wrapped.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <aside className="w-full max-w-lg border-l border-border bg-white flex flex-col min-h-0 shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-gray-900 text-sm">
          {isMessage ? "Edit the message" : "Edit the time"}
        </h2>
        <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isMessage && (
          <>
            <label className="block text-xs font-medium text-gray-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400"
            />
            <label className="block text-xs font-medium text-gray-500">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400"
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Timing</label>
                <input
                  type="number"
                  min={0}
                  value={timingValue}
                  onChange={(e) => setTimingValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400"
                />
              </div>
              <select
                value={timingUnit}
                onChange={(e) => setTimingUnit(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400"
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            {templateSlug === "reminders" && (
              <>
                <label className="block text-xs font-medium text-gray-500">Send condition</label>
                <select
                  value={sendCondition}
                  onChange={(e) => setSendCondition(e.target.value as SendConditionKey)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400"
                >
                  {SEND_CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </>
        )}

        {isMessage && (
          <>
            {templateSlug === "reminders" && (
              <>
                <label className="block text-xs font-medium text-gray-500">Send condition</label>
                <select
                  value={sendCondition}
                  onChange={(e) => setSendCondition(e.target.value as SendConditionKey)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400"
                >
                  {SEND_CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            {step.kind === "email" && (
              <>
                <label className="block text-xs font-medium text-gray-500">Subject line</label>
                <input
                  ref={subjectRef}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setInsertTarget("subject")}
                  disabled={preview}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400 disabled:bg-gray-50"
                />
              </>
            )}
            <label className="block text-xs font-medium text-gray-500">Message</label>
            {preview ? (
              <div className="rounded-lg border border-border bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap min-h-[160px]">
                {applySmartCommandPreview(body)}
              </div>
            ) : (
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setInsertTarget("body")}
                rows={10}
                maxLength={isSms ? smsLimit : undefined}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-teal-400 resize-y"
              />
            )}
            {isSms && (
              <p className={`text-xs ${body.length > smsLimit - 25 ? "text-rose-600" : "text-gray-400"}`}>
                {body.length}/{smsLimit} characters. Emojis count as two characters.
              </p>
            )}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              Optionally, you can add Forms to a message by using Smart Commands and selecting any Forms
              you wish to include. With smart form rules, this is not necessary.
            </div>

            <SmartCommandsPanel
              disabled={preview}
              templateSlug={templateSlug}
              onInsert={insertSmartCommand}
            />
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          {isMessage && (
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-border rounded-lg hover:bg-gray-50"
            >
              {preview ? "Exit preview" : "Preview"}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center gap-1"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave(
              isMessage
                ? {
                    body,
                    subject,
                    title,
                    condition_label: conditionLabelFor(sendCondition),
                    meta: { ...(step.meta || {}), send_condition: sendCondition },
                  }
                : {
                    title,
                    subtitle,
                    timing_value: timingValue,
                    timing_unit: timingUnit,
                    condition_label: conditionLabelFor(sendCondition),
                  }
            )
          }
          className="px-4 py-1.5 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
        >
          Save and exit
        </button>
      </div>
    </aside>
  );
}
