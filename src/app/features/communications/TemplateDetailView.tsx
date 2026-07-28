import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
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
  staffApi,
} from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { CommunicationTemplate, CommunicationTemplateStep } from "../../types";
import { applySmartCommandPreview } from "./smartCommands";
import { SmartCommandsPanel } from "./SmartCommandsPanel";

type DetailTab = "actions" | "performance" | "history";
type EditTarget =
  | { kind: "trigger" | "message"; step: CommunicationTemplateStep }
  | null;

export function TemplateDetailView({
  templateId,
  onBack,
}: {
  templateId: string;
  onBack: () => void;
}) {
  const [template, setTemplate] = useState<CommunicationTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("actions");
  const [edit, setEdit] = useState<EditTarget>(null);
  const [confirmActivate, setConfirmActivate] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  function refresh() {
    return staffApi.communicationTemplates
      .get(templateId)
      .then((row) => setTemplate(mapCommunicationTemplate(row)));
  }

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
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

  async function addStep(kind: "email" | "sms") {
    if (!template) return;
    try {
      await staffApi.communicationTemplates.addStep(template.id, {
        kind,
        title: kind === "email" ? "New Email" : "New SMS",
        body: "",
        subject: kind === "email" ? "Subject" : "",
      });
      await refresh();
      toastSuccess("Step added");
    } catch {
      toastError("Could not add step.");
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

  if (loading || !template) {
    return (
      <div className="px-6 py-5">
        <p className="text-sm text-gray-400">Loading template…</p>
      </div>
    );
  }

  const trigger = template.steps.find((s) => s.kind === "trigger");
  const messages = template.steps.filter((s) => s.kind === "email" || s.kind === "sms");

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
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
            {template.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">{template.description}</p>
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
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            This template is in multiple locations. Any changes you make will affect all of those
            locations using this template.
          </div>
        )}

        <div className="flex items-center gap-1">
          <button type="button" className={tabCls(tab === "actions")} onClick={() => setTab("actions")}>
            Actions
          </button>
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
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {tab === "actions" && (
            <div className="max-w-md mx-auto space-y-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4 text-center">
                Action — what causes the template to send
              </p>

              {trigger && (
                <SequenceTile
                  step={trigger}
                  onEdit={() => setEdit({ kind: "trigger", step: trigger })}
                />
              )}

              {trigger?.conditionLabel && (
                <div className="flex justify-center py-2">
                  <div className="rounded-full bg-white border border-border px-3 py-1.5 text-xs text-gray-600 shadow-sm">
                    {trigger.conditionLabel}{" "}
                    <button type="button" className="text-teal-600 font-medium ml-1">
                      + Add additional sequence
                    </button>
                  </div>
                </div>
              )}

              {!trigger?.conditionLabel && <Connector />}

              <div className="space-y-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 text-center pt-2">
                  Email / SMS messages
                </p>
                {messages.map((step, i) => (
                  <div key={step.id}>
                    <SequenceTile
                      step={step}
                      onEdit={() => setEdit({ kind: "message", step })}
                    />
                    {i < messages.length - 1 && <Connector />}
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <div className="relative group">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center shadow-sm"
                    title="Add another sequence"
                  >
                    <Plus size={16} />
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col gap-1 bg-white border border-border rounded-lg shadow-lg p-1 z-10 min-w-[140px]">
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
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-teal-600 mt-2">Add another sequence</p>
            </div>
          )}

          {tab === "performance" && (
            <div className="max-w-lg mx-auto text-center py-16">
              <p className="text-sm text-gray-500">
                {template.totalSent} messages sent to {template.recipients} recipients.
              </p>
              <p className="text-xs text-gray-400 mt-2">Detailed performance metrics coming soon.</p>
            </div>
          )}

          {tab === "history" && (
            <div className="max-w-lg mx-auto text-center py-16">
              <p className="text-sm text-gray-500">No recent send history for this template.</p>
            </div>
          )}
        </div>

        {edit && (
          <StepEditorPanel
            step={edit.step}
            isMessage={edit.kind === "message"}
            preview={preview}
            setPreview={setPreview}
            saving={saving}
            onClose={() => {
              setEdit(null);
              setPreview(false);
            }}
            onSave={saveStep}
            onDelete={
              edit.kind === "message" ? () => removeStep(edit.step.id) : undefined
            }
          />
        )}
      </div>

      {confirmActivate !== null && (
        <ConfirmModal
          title={confirmActivate ? "Activate template?" : "Deactivate template?"}
          message={
            confirmActivate
              ? "Patients will start receiving this automated sequence. Continue?"
              : "This template will stop sending until you turn it back on."
          }
          confirmLabel="Yes"
          submitting={saving}
          onConfirm={() => setActive(confirmActivate)}
          onCancel={() => setConfirmActivate(null)}
        />
      )}
    </div>
  );
}

function Connector() {
  return <div className="w-px h-5 bg-gray-200 mx-auto" />;
}

function SequenceTile({
  step,
  onEdit,
}: {
  step: CommunicationTemplateStep;
  onEdit: () => void;
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
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-teal-600 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

function StepEditorPanel({
  step,
  isMessage,
  preview,
  setPreview,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  step: CommunicationTemplateStep;
  isMessage: boolean;
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
            />
            <label className="block text-xs font-medium text-gray-500">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Timing</label>
                <input
                  type="number"
                  min={0}
                  value={timingValue}
                  onChange={(e) => setTimingValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
                />
              </div>
              <select
                value={timingUnit}
                onChange={(e) => setTimingUnit(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </>
        )}

        {isMessage && (
          <>
            {step.kind === "email" && (
              <>
                <label className="block text-xs font-medium text-gray-500">Subject line</label>
                <input
                  ref={subjectRef}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setInsertTarget("subject")}
                  disabled={preview}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 disabled:bg-gray-50"
                />
              </>
            )}
            <label className="block text-xs font-medium text-gray-500">Message</label>
            {preview ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap min-h-[160px]">
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 resize-y"
              />
            )}
            {isSms && (
              <p className={`text-xs ${body.length > smsLimit - 25 ? "text-rose-600" : "text-gray-400"}`}>
                {body.length}/{smsLimit} characters. Emojis count as two characters.
              </p>
            )}

            <SmartCommandsPanel disabled={preview} onInsert={insertSmartCommand} />
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          {isMessage && (
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
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
                ? { body, subject, title }
                : {
                    title,
                    subtitle,
                    timing_value: timingValue,
                    timing_unit: timingUnit,
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
