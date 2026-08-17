import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Sparkles } from "lucide-react";
import { publicAgentApi, type AgentField, type AgentReviewItem, type PublicApiError } from "../lib/public-agent-api";
import type { AgentSession, PublicBranding, PublicUpcomingAppointment, PublicVerifyResult } from "../lib/public-agent-api";
import { DobInput } from "./DobInput";
import { BrandedShell, VisitCard } from "./sharedPublicUi";
import { PublicFieldInput, emptyMedicalAlertsValue, isMedicalAlertsComplete, type FieldValue, type MedicalAlertsValue } from "./sharedPublicUi";
import { ChatFileLink, extractFileUrl, fileForTurn, fileLabelFromUrl } from "../features/forms/chatFileLinks";
import { AgentSpokenText, ChatRobot, ChatRobotTyping } from "./ChatRobot";
import { dobInputBounds, dobIsoError, isDobField } from "../lib/fieldFormat";
import { DatePicker } from "../components/shared/DatePicker";
import type { FormFieldType, MedicalAlertCatalog, MedicalAlertCategory, PublicFormField } from "../types";

type Step = "loading" | "invalid" | "verify" | "pick" | "chat" | "done";

const SESSION_STORAGE_KEY = "nex_agent_ctx";

type SavedCtx = {
  lastName: string;
  dob: string;
  sessionId: string;
  formRequestId: string;
};

function loadCtx(token: string): SavedCtx | null {
  try {
    const raw = localStorage.getItem(`${SESSION_STORAGE_KEY}:${token}`);
    return raw ? (JSON.parse(raw) as SavedCtx) : null;
  } catch {
    return null;
  }
}

function saveCtx(token: string, ctx: SavedCtx) {
  localStorage.setItem(`${SESSION_STORAGE_KEY}:${token}`, JSON.stringify(ctx));
}

function clearCtx(token: string) {
  localStorage.removeItem(`${SESSION_STORAGE_KEY}:${token}`);
}

function toPublicField(f: AgentField): PublicFormField {
  return {
    id: f.id,
    type: f.type as FormFieldType,
    label: f.label,
    required: f.required,
    options: f.options,
    page: 1,
    minLength: null,
    maxLength: null,
    conditionalFieldId: null,
    conditionalValue: "",
    placeholder: f.placeholder,
  };
}

const MEDICAL_ALERTS_TYPES = new Set(["medical_alerts_dropdown", "medical_alerts_radio"]);
const CHIP_TYPES = new Set(["checkbox", "radio", "dropdown"]);
const GUIDED_TYPES = new Set([
  "date",
  "date_entry",
  "email",
  "phone",
  "number",
  "signature",
  "file",
  "payment",
  "select_boxes",
  "checkbox",
  "radio",
  "dropdown",
]);

function medicalValueFromSession(session: AgentSession): MedicalAlertsValue {
  const drafts = session.draftAnswers ?? {};
  const fid = session.currentField?.id;
  const raw =
    (fid ? drafts[fid] : undefined) ??
    drafts["medical-alerts"] ??
    Object.values(drafts).find(
      (v) => v && typeof v === "object" && !Array.isArray(v) && ("condition" in (v as object) || "allergy" in (v as object) || "medication" in (v as object))
    );
  const empty = emptyMedicalAlertsValue(session.medicalAlerts);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const obj = raw as MedicalAlertsValue;
  const out: MedicalAlertsValue = { ...empty };
  for (const category of ["condition", "allergy", "medication"] as const) {
    const block = obj[category];
    out[category] = {
      responses: { ...(empty[category]?.responses ?? {}), ...(block?.responses ?? {}) },
      writeIns: [...(block?.writeIns ?? [])],
      labels: { ...(block?.labels ?? {}) },
    };
  }
  return out;
}

const REVIEW_CATEGORY_LABELS: Record<MedicalAlertCategory, string> = {
  condition: "Conditions",
  allergy: "Allergies",
  medication: "Medications",
};

const rememberedAlertLabels = new Map<string, string>();

function catalogLabelMap(catalog: MedicalAlertCatalog | null): Map<string, string> {
  if (catalog) {
    for (const entries of Object.values(catalog)) {
      for (const entry of entries) {
        rememberedAlertLabels.set(entry.id.toLowerCase(), entry.label);
      }
    }
  }
  return new Map(rememberedAlertLabels);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lookupAlertLabel(
  id: string,
  catalog: Map<string, string>,
  stored?: Record<string, string>
): string {
  if (stored?.[id]) return stored[id];
  const lower = id.toLowerCase();
  if (stored?.[lower]) return stored[lower];
  const fromCatalog = catalog.get(lower);
  if (fromCatalog) return fromCatalog;
  const compact = lower.replace(/-/g, "");
  for (const [key, label] of catalog) {
    if (key.replace(/-/g, "") === compact) return label;
  }
  if (UUID_RE.test(id)) return "Selected item";
  return id;
}

function stampMedicalAlertLabels(
  value: MedicalAlertsValue,
  catalog: MedicalAlertCatalog | null
): MedicalAlertsValue {
  const map = catalogLabelMap(catalog);
  const next: MedicalAlertsValue = { ...value };
  for (const category of ["condition", "allergy", "medication"] as const) {
    const block = next[category];
    if (!block) continue;
    const labels = { ...(block.labels ?? {}) };
    for (const id of Object.keys(block.responses ?? {})) {
      if (!labels[id]) labels[id] = lookupAlertLabel(id, map, block.labels);
    }
    next[category] = { ...block, labels };
  }
  return next;
}

function formatMedicalAlertsReview(value: unknown, catalog: MedicalAlertCatalog | null): string {
  if (typeof value === "string" && value.trim()) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "None listed";
  const obj = value as MedicalAlertsValue;
  const labels = catalogLabelMap(catalog);
  const parts: string[] = [];
  for (const category of ["condition", "allergy", "medication"] as const) {
    const block = obj[category];
    const yesIds = Object.entries(block?.responses ?? {})
      .filter(([, ans]) => ans === "yes")
      .map(([id]) => id);
    const named = yesIds.map((id) => lookupAlertLabel(id, labels, block?.labels));
    const writeIns = block?.writeIns ?? [];
    const listed = [...named, ...writeIns];
    if (listed.length > 0) {
      parts.push(`${REVIEW_CATEGORY_LABELS[category]}: ${listed.join(", ")}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "None listed";
}

function replaceIdsInReviewText(text: string, catalog: MedicalAlertCatalog | null): string {
  const map = catalogLabelMap(catalog);
  if (map.size === 0) return text;
  return text.replace(UUID_RE, (id) => lookupAlertLabel(id, map));
}

function formatReviewValue(item: AgentReviewItem, catalog: MedicalAlertCatalog | null, draftValue?: unknown): string {
  const value = item.value;
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (item.type === "payment" && value === "pay_at_office") return "Pay at the office";
  if (item.type === "file" && typeof value === "string") {
    const name = value.split("/").pop() || value;
    return name;
  }
  if (item.type === "medical_alerts_dropdown" || item.type === "medical_alerts_radio") {
    const raw = draftValue && typeof draftValue === "object" && !Array.isArray(draftValue) ? draftValue : value;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return formatMedicalAlertsReview(raw, catalog);
    }
    if (typeof value === "string") return replaceIdsInReviewText(value, catalog);
  }
  if (typeof value === "object") return formatMedicalAlertsReview(value, catalog);
  return String(value);
}

function ChoiceChips({
  field,
  disabled,
  onSelect,
}: {
  field: AgentField;
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <div className="flex flex-wrap gap-2 mb-2">
        {(["Yes", "No"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.toLowerCase())}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 disabled:opacity-50 transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "radio" || field.type === "dropdown") {
    return (
      <div className="flex flex-wrap gap-2 mb-2">
        {field.options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 disabled:opacity-50 transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-100";

export function PublicAgentPage({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [invalidReason, setInvalidReason] = useState("This link is invalid or has expired.");

  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [verifyResult, setVerifyResult] = useState<PublicVerifyResult | null>(null);
  const [activeFormRequestId, setActiveFormRequestId] = useState<string | null>(null);

  const [session, setSession] = useState<AgentSession | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [medicalDraft, setMedicalDraft] = useState<MedicalAlertsValue | undefined>(undefined);
  const [selectBoxes, setSelectBoxes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [visit, setVisit] = useState<PublicUpcomingAppointment | null>(null);
  const [robotAsking, setRobotAsking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    publicAgentApi
      .tokenInfo(token)
      .then((b) => {
        setBranding(b);
        const saved = loadCtx(token);
        if (saved) {
          setLastName(saved.lastName);
          setDob(saved.dob);
          setActiveFormRequestId(saved.formRequestId);
        }
        setStep("verify");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setInvalidReason(apiErr?.detail || invalidReason);
        setStep("invalid");
      });
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.turns.length, session?.done, sending, uploading]);

  const lastAgentTurn = session?.turns.reduce<{ content: string; created_at: string } | null>(
    (acc, t) => (t.role === "agent" ? t : acc),
    null
  );
  const lastAgentKey = lastAgentTurn ? `${lastAgentTurn.created_at}:${lastAgentTurn.content}` : "";
  const lastTurnRole = session?.turns.length ? session.turns[session.turns.length - 1].role : null;

  useEffect(() => {
    if (!lastAgentKey || sending || uploading || lastTurnRole !== "agent") {
      setRobotAsking(false);
      return;
    }
    setRobotAsking(true);
    const timer = window.setTimeout(() => setRobotAsking(false), 3400);
    return () => window.clearTimeout(timer);
  }, [lastAgentKey, sending, uploading, lastTurnRole]);

  useEffect(() => {
    const field = session?.currentField;
    if (!field || !MEDICAL_ALERTS_TYPES.has(field.type)) {
      setMedicalDraft(undefined);
      return;
    }
    setMedicalDraft(medicalValueFromSession(session));
  }, [session?.sessionId, session?.currentField?.id]);

  useEffect(() => {
    const field = session?.currentField;
    if (!field || field.type !== "select_boxes") {
      setSelectBoxes([]);
      return;
    }
    const existing = session.draftAnswers[field.id];
    setSelectBoxes(Array.isArray(existing) ? (existing as string[]) : []);
  }, [session?.currentField?.id, session?.draftAnswers]);

  useEffect(() => {
    setMessage("");
  }, [session?.currentField?.id]);

  function handleVerify() {
    if (verifying) return;
    setVerifyError(null);
    if (!lastName.trim() || !dob) {
      setVerifyError("Please enter last name and date of birth.");
      return;
    }
    setVerifying(true);
    publicAgentApi
      .verify(token, lastName.trim(), dob)
      .then(async (r) => {
        setVerifyResult(r);
        setBranding(r);
        setVisit(r.upcomingAppointment);
        const pending = r.forms.filter((f) => !f.completed);
        if (pending.length === 0) {
          setStep("done");
          return;
        }
        if (pending.length === 1) {
          await startChat(pending[0].requestId, loadCtx(token)?.sessionId);
          return;
        }
        setStep("pick");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setVerifyError(apiErr?.detail || "Verification failed.");
      })
      .finally(() => setVerifying(false));
  }

  async function startChat(formRequestId: string, resumeSessionId?: string) {
    setChatError(null);
    setActiveFormRequestId(formRequestId);
    try {
      const s = await publicAgentApi.startSession(token, {
        lastName: lastName.trim(),
        dob,
        formRequestId,
        sessionId: resumeSessionId,
      });
      setSession(s);
      if (s.upcomingAppointment) setVisit(s.upcomingAppointment);
      saveCtx(token, { lastName: lastName.trim(), dob, sessionId: s.sessionId, formRequestId });
      setStep("chat");
    } catch (err: unknown) {
      const apiErr = err as PublicApiError;
      setChatError(apiErr?.detail || "Could not start intake chat.");
    }
  }

  async function handleSend(overrideText?: string, structuredValue?: unknown) {
    if (!session || sending) return;
    if (session.status === "emergency_stopped") return;
    const text = (overrideText ?? message).trim();
    if (!text) return;
    const field = session.currentField;
    if (field && (field.type === "date" || field.type === "date_entry") && isDobField(field)) {
      const err = dobIsoError(/^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || err) {
        setChatError(err || "That doesn't look like a real date of birth. Please pick a date in the past (for example, 03/15/1990).");
        return;
      }
    }
    setSending(true);
    setChatError(null);
    if (!overrideText) setMessage("");
    try {
      const s = await publicAgentApi.sendMessage(token, {
        lastName: lastName.trim(),
        dob,
        sessionId: session.sessionId,
        message: text,
        structuredValue,
      });
      setSession(s);
      if (s.upcomingAppointment) setVisit(s.upcomingAppointment);
      if (s.status === "emergency_stopped") {
        setChatError("Intake paused. Please contact the clinic or call 911 for emergencies.");
      }
    } catch (err: unknown) {
      const apiErr = err as PublicApiError;
      setChatError(apiErr?.detail || "Could not send message.");
      if (!overrideText) setMessage(text);
    } finally {
      setSending(false);
    }
  }

  async function handleMedicalContinue() {
    const field = session?.currentField;
    if (!field || !MEDICAL_ALERTS_TYPES.has(field.type)) return;
    const payload = stampMedicalAlertLabels(
      medicalDraft ?? medicalValueFromSession(session),
      session.medicalAlerts
    );
    if (field.type === "medical_alerts_radio" && !isMedicalAlertsComplete(payload, session.medicalAlerts)) {
      setChatError('Please answer Yes or No for each item, or tap "Set unanswered questions to No".');
      return;
    }
    await handleSend("Completed medical history section", payload);
  }

  async function handleFilePicked(file: File | undefined) {
    if (!file || !session) return;
    setUploading(true);
    setChatError(null);
    try {
      const uploaded = await publicAgentApi.upload(token, {
        lastName: lastName.trim(),
        dob,
        sessionId: session.sessionId,
        file,
      });
      await handleSend(`Uploaded ${uploaded.filename}`, uploaded.url);
    } catch (err: unknown) {
      const apiErr = err as PublicApiError;
      setChatError(apiErr?.detail || "Could not upload file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleComplete() {
    if (!session || submitting) return;
    setSubmitting(true);
    setChatError(null);
    try {
      const result = await publicAgentApi.complete(token, {
        lastName: lastName.trim(),
        dob,
        sessionId: session.sessionId,
      });
      clearCtx(token);
      if (result.upcomingAppointment) setVisit(result.upcomingAppointment);
      if (result.remaining <= 0) {
        setStep("done");
      } else if (verifyResult) {
        const refreshed = await publicAgentApi.verify(token, lastName.trim(), dob);
        setVerifyResult(refreshed);
        if (refreshed.upcomingAppointment) setVisit(refreshed.upcomingAppointment);
        setSession(null);
        setStep("pick");
      }
    } catch (err: unknown) {
      const apiErr = err as PublicApiError;
      setChatError(apiErr?.detail || "Could not submit intake.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "loading") {
    return (
      <BrandedShell branding={null}>
        <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
      </BrandedShell>
    );
  }

  if (step === "invalid") {
    return (
      <BrandedShell branding={branding}>
        <div className="text-center py-12 px-4">
          <p className="text-gray-700 font-medium">{invalidReason}</p>
        </div>
      </BrandedShell>
    );
  }

  if (step === "verify") {
    return (
      <BrandedShell branding={branding}>
        <div className="max-w-md mx-auto py-8 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-teal-500" size={22} />
            <h1 className="text-xl font-bold text-gray-900">Chat intake</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Verify your identity to start a guided conversation instead of filling out a form.
          </p>
          {verifyError && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{verifyError}</div>}
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient last name</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
          <DobInput value={dob} onChange={setDob} className="mb-6" />
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Continue"}
          </button>
        </div>
      </BrandedShell>
    );
  }

  if (step === "pick" && verifyResult) {
    const pending = verifyResult.forms.filter((f) => !f.completed);
    const saved = loadCtx(token);
    return (
      <BrandedShell branding={branding}>
        <div className="max-w-lg mx-auto py-8 px-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Hi, {verifyResult.patientName}</h1>
          <p className="text-sm text-gray-500 mb-4">Choose a form to complete via chat.</p>
          <div className="mb-5">
            <VisitCard appointment={visit} />
          </div>
          {chatError && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{chatError}</div>}
          <ul className="space-y-3">
            {pending.map((f) => (
              <li key={f.requestId}>
                <button
                  type="button"
                  onClick={() =>
                    startChat(
                      f.requestId,
                      saved?.formRequestId === f.requestId ? saved.sessionId : undefined
                    )
                  }
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50/50 transition"
                >
                  <span className="font-semibold text-gray-900">{f.name}</span>
                  <span className="block text-xs text-teal-600 mt-0.5">Complete with chat assistant</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-gray-400">
            Prefer the classic form?{" "}
            <a href={`/forms/${token}`} className="text-teal-600 hover:underline">
              Open standard forms
            </a>
          </p>
        </div>
      </BrandedShell>
    );
  }

  if (step === "chat" && session) {
    const pct =
      session.progress.total > 0
        ? Math.round((session.progress.answered / session.progress.total) * 100)
        : 0;
    const stopped = session.status === "emergency_stopped";
    const currentField = session.currentField;
    const showMedical =
      currentField && MEDICAL_ALERTS_TYPES.has(currentField.type) && session.medicalAlerts;
    const showChips =
      currentField &&
      !showMedical &&
      CHIP_TYPES.has(currentField.type) &&
      (currentField.type === "checkbox" || currentField.options.length > 0);
    const canSkip = currentField && !currentField.required && !session.done && !stopped;
    const busy = stopped || sending || uploading;
    const hideGenericInput =
      session.done ||
      Boolean(showMedical) ||
      Boolean(currentField && GUIDED_TYPES.has(currentField.type));
    const reviewCatalog =
      session.medicalAlerts ??
      verifyResult?.forms.find((f) => f.requestId === session.formRequestId)?.medicalAlerts ??
      verifyResult?.forms.find((f) => f.medicalAlerts)?.medicalAlerts ??
      null;
    const lastAgentIndex = session.turns.reduce((acc, t, i) => (t.role === "agent" ? i : acc), -1);
    const lastTurnIsAgent = session.turns.length > 0 && session.turns[session.turns.length - 1].role === "agent";

    return (
      <BrandedShell branding={branding}>
        <div className="flex flex-col h-[min(100dvh,800px)] max-w-lg mx-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-white/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <ChatRobot
                  mood={busy ? "thinking" : robotAsking ? "asking" : "idle"}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Angelina</p>
                  <p className="text-xs text-gray-500 truncate">
                    {busy
                      ? "Thinking…"
                      : robotAsking
                        ? "Asking a question…"
                        : session.done
                          ? "Intake ready to submit"
                          : session.formName}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-full shrink-0">
                {session.progress.answered}/{session.progress.total}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            {visit && (
              <div className="mt-2">
                <VisitCard appointment={visit} />
              </div>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/80">
            {session.turns.map((t, i) => {
              const file = fileForTurn(t, [], session.draftAnswers);
              const isLastAgent = t.role === "agent" && i === lastAgentIndex;
              const liveAsk = isLastAgent && lastTurnIsAgent && robotAsking && !busy && !session.done && !stopped;
              return (
              <div
                key={`${t.created_at}-${i}`}
                className={`flex items-end gap-2 ${t.role === "patient" ? "justify-end" : "justify-start"}`}
              >
                {t.role === "agent" && (
                  <ChatRobot mood={liveAsk ? "asking" : "idle"} size={36} label={isLastAgent ? "Angelina" : undefined} />
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    t.role === "patient"
                      ? "bg-teal-500 text-white rounded-br-md"
                      : t.role === "system"
                        ? "bg-gray-200 text-gray-600 text-xs italic"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  {isLastAgent && lastTurnIsAgent && !session.done ? (
                    <AgentSpokenText text={t.content} animate />
                  ) : (
                    t.content
                  )}
                  {file && (
                    <span className="block mt-1.5">
                      <ChatFileLink href={file.url} label={file.label} dark={t.role === "patient"} />
                    </span>
                  )}
                </div>
              </div>
              );
            })}
            {(sending || uploading) && <ChatRobotTyping />}
          </div>

          {chatError && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{chatError}</div>
          )}

          <div className="p-4 border-t border-gray-100 bg-white">
            {session.done && !stopped ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Review your answers</p>
                <p className="text-xs text-gray-500">Check this list, then tap Submit intake below.</p>
                <ul className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-100 bg-gray-50/80">
                  {session.reviewItems.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500">No answers to review.</li>
                  ) : (
                    session.reviewItems.map((item) => {
                      const fileUrl = extractFileUrl(item.value) || extractFileUrl(session.draftAnswers[item.fieldId]);
                      return (
                      <li key={item.fieldId} className="px-3 py-2">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        {fileUrl ? (
                          <ChatFileLink href={fileUrl} label={fileLabelFromUrl(fileUrl)} />
                        ) : (
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {formatReviewValue(item, reviewCatalog, session.draftAnswers[item.fieldId])}
                          </p>
                        )}
                      </li>
                      );
                    })
                  )}
                </ul>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={submitting}
                  className="w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit intake"}
                </button>
              </div>
            ) : showMedical && currentField ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  {currentField.type === "medical_alerts_dropdown"
                    ? "Search and add only what applies. Leave a section empty if none, then Continue."
                    : "Answer Yes or No for each item, then Continue."}
                </p>
                <div className="space-y-3 max-h-[22rem] overflow-y-auto">
                  <PublicFieldInput
                    field={toPublicField(currentField)}
                    value={(medicalDraft ?? medicalValueFromSession(session)) as FieldValue | undefined}
                    medicalAlerts={session.medicalAlerts}
                    onChange={(v) => setMedicalDraft(v as MedicalAlertsValue)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMedicalContinue}
                  disabled={busy}
                  className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                >
                  {sending ? "Saving…" : "Continue"}
                </button>
              </div>
            ) : (
              <>
                {showChips && currentField && (
                  <ChoiceChips
                    field={currentField}
                    disabled={busy}
                    onSelect={(val) => handleSend(val, val)}
                  />
                )}
                {currentField?.type === "select_boxes" && (
                  <div className="mb-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {currentField.options.map((opt) => {
                        const on = selectBoxes.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setSelectBoxes((prev) =>
                                prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
                              )
                            }
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                              on
                                ? "border-teal-500 bg-teal-500 text-white"
                                : "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                            } disabled:opacity-50`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={busy || (currentField.required && selectBoxes.length === 0)}
                      onClick={() => handleSend(selectBoxes.join(", ") || "None", selectBoxes)}
                      className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                    >
                      Continue
                    </button>
                  </div>
                )}
                {currentField && (currentField.type === "date" || currentField.type === "date_entry") && (
                  <div className="flex gap-2 mb-2 items-start">
                    <div className="flex-1 min-w-0">
                      <DatePicker
                        value={message}
                        min={isDobField(currentField) ? dobInputBounds().min : undefined}
                        max={isDobField(currentField) ? dobInputBounds().max : undefined}
                        disabled={busy}
                        side="top"
                        aria-label={currentField.label || "Date"}
                        onChange={(iso) => {
                          setMessage(iso);
                          setChatError(null);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSend(message, message)}
                      disabled={busy || !message.trim()}
                      className="px-4 h-[42px] rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 disabled:opacity-50 shrink-0"
                    >
                      Continue
                    </button>
                  </div>
                )}
                {currentField?.type === "email" && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={inputCls}
                      placeholder={currentField.placeholder || "name@email.com"}
                      value={message}
                      disabled={busy}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSend(message, message);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSend(message, message)}
                      disabled={busy || !message.trim()}
                      className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                )}
                {currentField?.type === "phone" && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputCls}
                      placeholder={currentField.placeholder || "Phone number"}
                      value={message}
                      disabled={busy}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSend(message, message);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSend(message, message)}
                      disabled={busy || !message.trim()}
                      className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                )}
                {currentField?.type === "number" && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      className={inputCls}
                      placeholder={currentField.placeholder || "Enter a number"}
                      value={message}
                      disabled={busy}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSend(message, message);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSend(message, message)}
                      disabled={busy || !message.trim()}
                      className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                )}
                {currentField?.type === "signature" && (
                  <div className="mb-2 space-y-2">
                    <input
                      className={`${inputCls} italic font-serif text-lg`}
                      placeholder="Type your full name to sign"
                      value={message}
                      disabled={busy}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleSend(message, message)}
                      disabled={busy || !message.trim()}
                      className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                    >
                      Sign
                    </button>
                  </div>
                )}
                {currentField?.type === "file" && (
                  <div className="mb-2">
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => handleFilePicked(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50 text-teal-800 text-sm font-medium hover:bg-teal-100 disabled:opacity-60"
                    >
                      <Paperclip size={16} />
                      {uploading ? "Uploading…" : "Attach a file"}
                    </button>
                  </div>
                )}
                {currentField?.type === "payment" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSend("I'll pay at the office", "pay_at_office")}
                    className="w-full mb-2 py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                  >
                    I'll pay at the office
                  </button>
                )}
                {canSkip && (
                  <button
                    type="button"
                    onClick={() => handleSend("skip")}
                    disabled={busy}
                    className="mb-2 text-xs font-medium text-gray-500 hover:text-teal-600 transition-colors"
                  >
                    Skip this question (optional)
                  </button>
                )}
                {!hideGenericInput && (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-100"
                      placeholder={stopped ? "Intake paused" : "Type your answer…"}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={busy}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={busy || !message.trim()}
                      className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </BrandedShell>
    );
  }

  if (step === "done") {
    return (
      <BrandedShell branding={branding}>
        <div className="text-center py-16 px-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">All set!</h1>
          <p className="text-sm text-gray-600 mb-4">
            Your intake has been submitted. The clinic will review your information.
          </p>
          <VisitCard appointment={visit} />
        </div>
      </BrandedShell>
    );
  }

  return null;
}
