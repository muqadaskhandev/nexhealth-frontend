import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { publicAgentApi, type AgentField, type PublicApiError } from "../lib/public-agent-api";
import type { AgentSession, PublicBranding, PublicVerifyResult } from "../lib/public-agent-api";
import { DobInput } from "./DobInput";
import { BrandedShell } from "./sharedPublicUi";
import { PublicFieldInput, isMedicalAlertsComplete, type FieldValue, type MedicalAlertsValue } from "./sharedPublicUi";
import type { FormFieldType, PublicFormField } from "../types";

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

  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [session?.turns.length]);

  useEffect(() => {
    const field = session?.currentField;
    if (!field || !MEDICAL_ALERTS_TYPES.has(field.type)) {
      setMedicalDraft(undefined);
      return;
    }
    const existing = session.draftAnswers[field.id];
    setMedicalDraft((existing as MedicalAlertsValue | undefined) ?? undefined);
  }, [session?.currentField?.id, session?.draftAnswers]);

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
    if (!field || !MEDICAL_ALERTS_TYPES.has(field.type) || !medicalDraft) return;
    if (!isMedicalAlertsComplete(medicalDraft, session.medicalAlerts)) {
      setChatError('Please answer Yes or No for each item, or tap "Set unanswered questions to No".');
      return;
    }
    await handleSend("Completed medical history section", medicalDraft);
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
      if (result.remaining <= 0) {
        setStep("done");
      } else if (verifyResult) {
        const refreshed = await publicAgentApi.verify(token, lastName.trim(), dob);
        setVerifyResult(refreshed);
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
          <p className="text-sm text-gray-500 mb-6">Choose a form to complete via chat.</p>
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
      (currentField.type === "checkbox" ||
        ((currentField.type === "radio" || currentField.type === "dropdown") && currentField.options.length > 0));
    const canSkip = currentField && !currentField.required && !session.done && !stopped;

    return (
      <BrandedShell branding={branding}>
        <div className="flex flex-col h-[min(100dvh,800px)] max-w-lg mx-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-white/80">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{session.formName}</p>
                <p className="text-xs text-gray-500">Chat intake · {session.patientName}</p>
              </div>
              <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                {session.progress.answered}/{session.progress.total}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/80">
            {session.turns.map((t, i) => (
              <div
                key={`${t.created_at}-${i}`}
                className={`flex ${t.role === "patient" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    t.role === "patient"
                      ? "bg-teal-500 text-white rounded-br-md"
                      : t.role === "system"
                        ? "bg-gray-200 text-gray-600 text-xs italic"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  {t.content}
                </div>
              </div>
            ))}
          </div>

          {chatError && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{chatError}</div>
          )}

          <div className="p-4 border-t border-gray-100 bg-white">
            {session.done && !stopped ? (
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit intake"}
              </button>
            ) : showMedical && currentField ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <PublicFieldInput
                  field={toPublicField(currentField)}
                  value={medicalDraft as FieldValue | undefined}
                  medicalAlerts={session.medicalAlerts}
                  onChange={(v) => setMedicalDraft(v as MedicalAlertsValue)}
                />
                <button
                  type="button"
                  onClick={handleMedicalContinue}
                  disabled={stopped || sending}
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
                    disabled={stopped || sending}
                    onSelect={(val) => handleSend(val)}
                  />
                )}
                {canSkip && (
                  <button
                    type="button"
                    onClick={() => handleSend("skip")}
                    disabled={stopped || sending}
                    className="mb-2 text-xs font-medium text-gray-500 hover:text-teal-600 transition-colors"
                  >
                    Skip this question (optional)
                  </button>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-100"
                    placeholder={stopped ? "Intake paused" : "Type your answer…"}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={stopped || sending}
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
                    disabled={stopped || sending || !message.trim()}
                    className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send size={20} />
                  </button>
                </div>
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
          <p className="text-sm text-gray-600">Your intake has been submitted. The clinic will review your information.</p>
        </div>
      </BrandedShell>
    );
  }

  return null;
}
