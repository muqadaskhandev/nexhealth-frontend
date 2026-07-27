import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { publicFormsApi, type PublicApiError } from "../lib/public-forms-api";
import type { PublicBranding, PublicForm, PublicVerifyResult } from "../types";
import { DobInput } from "./DobInput";
import {
  BrandedShell,
  PublicConfirmScreen,
  PublicFieldInput,
  PublicFormFillCard,
  fmtRelative,
  isFieldVisible,
  validateFormPage,
  type Answers,
  type FieldValue,
} from "./sharedPublicUi";

type Step = "loading" | "invalid" | "verify" | "list" | "fill" | "done";

export function PublicFormsPage({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [invalidReason, setInvalidReason] = useState("This link is invalid or has expired.");

  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [result, setResult] = useState<PublicVerifyResult | null>(null);
  const [activeFormIdx, setActiveFormIdx] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Record<string, Answers>>({});
  const [fillError, setFillError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    publicFormsApi
      .tokenInfo(token)
      .then((b) => {
        setBranding(b);
        setStep("verify");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setInvalidReason(apiErr?.detail || "This link is invalid or has expired.");
        setStep("invalid");
      });
  }, [token]);

  function handleVerify() {
    if (verifying) return;
    setVerifyError(null);
    if (!lastName.trim()) {
      setVerifyError("Please enter the patient's last name.");
      return;
    }
    if (!dob) {
      setVerifyError("Please enter the patient's date of birth.");
      return;
    }
    setVerifying(true);
    publicFormsApi
      .verify(token, lastName.trim(), dob)
      .then((r) => {
        setResult(r);
        setBranding(r);
        setStep("list");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setVerifyError(apiErr?.detail || "We couldn't verify your information — check your last name and date of birth.");
      })
      .finally(() => setVerifying(false));
  }

  function firstIncompleteIndex(forms: PublicForm[]): number | null {
    const idx = forms.findIndex((f) => !f.completed);
    return idx === -1 ? null : idx;
  }

  function ensurePrefilled(form: PublicForm) {
    setAnswers((prev) => (prev[form.requestId] ? prev : { ...prev, [form.requestId]: form.prefillAnswers as Answers }));
  }

  function startFilling() {
    if (!result) return;
    const idx = firstIncompleteIndex(result.forms);
    if (idx === null) {
      setStep("done");
      return;
    }
    ensurePrefilled(result.forms[idx]);
    setActiveFormIdx(idx);
    setPage(1);
    setFillError(null);
    setStep("fill");
  }

  const activeForm = result && activeFormIdx !== null ? result.forms[activeFormIdx] : null;
  const activeAnswers = activeForm ? answers[activeForm.requestId] ?? {} : {};

  function setFieldValue(requestId: string, fieldId: string, v: FieldValue) {
    setAnswers((prev) => ({ ...prev, [requestId]: { ...(prev[requestId] ?? {}), [fieldId]: v } }));
  }

  function handleFillNext() {
    if (!activeForm) return;
    const err = validateFormPage(activeForm.fields, activeAnswers, page, activeForm.medicalAlerts);
    if (err) {
      setFillError(err);
      return;
    }
    setFillError(null);
    if (page < activeForm.pageCount) {
      setPage((p) => p + 1);
      return;
    }
    handleSubmitForm();
  }

  function handleFillBack() {
    setFillError(null);
    if (page > 1) {
      setPage((p) => p - 1);
      return;
    }
    setStep("list");
  }

  function handleSubmitForm() {
    if (!activeForm || !result || submitting) return;
    setSubmitting(true);
    publicFormsApi
      .submit(token, { lastName: lastName.trim(), dob, formRequestId: activeForm.requestId, answers: activeAnswers })
      .then(() => {
        const updatedForms = result.forms.map((f, i) => (i === activeFormIdx ? { ...f, completed: true } : f));
        const updatedResult = { ...result, forms: updatedForms };
        setResult(updatedResult);
        const nextIdx = firstIncompleteIndex(updatedForms);
        if (nextIdx === null) {
          setStep("done");
        } else {
          ensurePrefilled(updatedForms[nextIdx]);
          setActiveFormIdx(nextIdx);
          setPage(1);
        }
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setFillError(apiErr?.detail || "Could not submit this form — please try again.");
      })
      .finally(() => setSubmitting(false));
  }

  if (step === "loading") {
    return (
      <BrandedShell branding={null}>
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-teal-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </BrandedShell>
    );
  }

  if (step === "invalid") {
    return (
      <BrandedShell branding={null}>
        <div className="text-center py-6 space-y-2">
          <p className="text-base font-bold text-gray-900">This link isn&apos;t available</p>
          <p className="text-sm text-gray-500">{invalidReason}</p>
        </div>
      </BrandedShell>
    );
  }

  if (step === "verify") {
    return (
      <BrandedShell branding={branding}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-5">Verify patient details</h1>
        {verifyError && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{verifyError}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Patient last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
              autoComplete="family-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Patient date of birth</label>
            <DobInput value={dob} onChange={setDob} disabled={verifying} />
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying || !lastName.trim() || !dob}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {verifying ? "Verifying…" : "Submit"}
          </button>
        </div>
      </BrandedShell>
    );
  }

  if (step === "list" && result) {
    const total = result.forms.length;
    const completedCount = result.forms.filter((f) => f.completed).length;
    const soonest = result.forms.filter((f) => !f.completed).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
    return (
      <BrandedShell branding={result}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">Fill out your forms</h1>
        <p className="text-sm text-gray-500 text-center mb-1">Save time on the day of your appointment by completing all forms.</p>
        {soonest && (
          <p className="text-sm text-gray-500 text-center mb-5">These forms will expire in {fmtRelative(soonest.expiresAt)}</p>
        )}
        {!soonest && <div className="mb-5" />}
        {total === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">You have no forms to complete right now.</p>
        ) : (
          <button
            onClick={startFilling}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <span className="text-sm font-semibold">Forms for {result.patientName}</span>
            <span className="flex items-center gap-1.5 text-sm">
              {completedCount} of {total}
              <ChevronRight size={16} />
            </span>
          </button>
        )}
      </BrandedShell>
    );
  }

  if (step === "fill" && activeForm) {
    const fields = activeForm.fields.filter((f) => f.page === page && isFieldVisible(f, activeAnswers));
    return (
      <PublicFormFillCard
        branding={result}
        formName={activeForm.name}
        page={page}
        pageCount={activeForm.pageCount}
        onBack={handleFillBack}
        footer={
          <button
            onClick={handleFillNext}
            disabled={submitting}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Submitting…" : page < activeForm.pageCount ? "Next" : "Submit"}
          </button>
        }
      >
        {fillError && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{fillError}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 col-span-2">Nothing to fill out on this page.</p>
          ) : (
            fields.map((f) => (
              <div key={f.id} className={f.width === "half" ? "col-span-1" : "col-span-2"}>
                <PublicFieldInput
                  field={f}
                  value={activeAnswers[f.id]}
                  medicalAlerts={activeForm.medicalAlerts}
                  onChange={(v) => setFieldValue(activeForm.requestId, f.id, v)}
                />
              </div>
            ))
          )}
        </div>
      </PublicFormFillCard>
    );
  }

  if (step === "done") {
    return <PublicConfirmScreen branding={result} />;
  }

  return null;
}
