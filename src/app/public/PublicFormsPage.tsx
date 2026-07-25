import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, Paperclip } from "lucide-react";
import { publicFormsApi, type PublicApiError } from "../lib/public-forms-api";
import { toastError, toastSuccess } from "../lib/toast";
import type { PublicBranding, PublicForm, PublicFormField, PublicVerifyResult } from "../types";

type FieldValue = string | boolean | string[];
type Answers = Record<string, FieldValue>;

type Step = "loading" | "invalid" | "verify" | "list" | "fill" | "done";

function fmtRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "soon";
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return "less than a day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function fieldValueMatches(actual: FieldValue | undefined, expected: string): boolean {
  if (actual === undefined) return false;
  if (Array.isArray(actual)) return actual.includes(expected);
  if (typeof actual === "boolean") return actual === (expected.toLowerCase() === "true");
  return actual === expected;
}

function PublicFieldInput({ field, value, onChange }: { field: PublicFormField; value: FieldValue | undefined; onChange: (v: FieldValue) => void }) {
  const label = (
    <label className="block text-sm font-medium text-gray-800 mb-1.5">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </label>
  );
  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400";

  switch (field.type) {
    case "textarea":
      return <div>{label}<textarea rows={3} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={`${inputCls} resize-none`} /></div>;
    case "checkbox":
      return (
        <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={(value as boolean) ?? false} onChange={e => onChange(e.target.checked)} />
          <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
        </label>
      );
    case "select_boxes": {
      const selected = (value as string[]) ?? [];
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={e => onChange(e.target.checked ? [...selected, opt] : selected.filter(o => o !== opt))} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "radio":
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {field.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name={field.id} checked={value === opt} onChange={() => onChange(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    case "dropdown":
      return (
        <div>
          {label}
          <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    case "signature":
      return (
        <div>
          {label}
          <input
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder="Type your full name to sign"
            className={`${inputCls} italic font-serif`}
          />
        </div>
      );
    case "file":
      return (
        <div>
          {label}
          <label className="flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            <Paperclip size={14} />
            {(value as string) || "Choose file to attach"}
            <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0]?.name ?? "")} />
          </label>
        </div>
      );
    case "payment":
      return (
        <div>
          {label}
          <div className="border border-gray-200 rounded-lg px-3.5 py-3 text-xs text-gray-500 bg-gray-50">
            Payment details are collected securely at checkout.
          </div>
        </div>
      );
    case "date_entry":
      return <div>{label}<input type="date" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "address":
      return <div>{label}<input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} placeholder="Start typing an address…" className={inputCls} /></div>;
    case "date":
      return <div>{label}<input type="date" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "email":
      return <div>{label}<input type="email" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "number":
      return <div>{label}<input type="number" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "phone":
      return <div>{label}<input type="tel" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
    case "insurance":
      return <div>{label}<input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} placeholder="Insurance provider / member ID" className={inputCls} /></div>;
    case "content":
      return <p className="text-sm text-gray-700 whitespace-pre-wrap">{field.label}</p>;
    default:
      return <div>{label}<input type="text" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} className={inputCls} /></div>;
  }
}

function BrandedShell({ branding, children }: { branding: PublicBranding | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {branding && (
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            {branding.practiceLogoUrl ? (
              <img src={branding.practiceLogoUrl} alt={branding.practiceName} className="h-9 w-9 object-contain flex-shrink-0" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {branding.practiceName.slice(0, 1) || "P"}
              </div>
            )}
            <div className="h-8 w-px bg-gray-200 flex-shrink-0" />
            <p className="text-sm font-bold text-gray-900 leading-tight">{branding.practiceName}</p>
          </div>
        )}
        <div className={branding ? "border-t border-gray-100" : ""} />
        <div className="px-6 py-6">{children}</div>
        {branding && (branding.locationName || branding.locationAddress || branding.locationPhone) && (
          <div className="border-t border-gray-100 px-6 py-5 text-center space-y-2">
            <div className="text-xs text-gray-500">
              {branding.locationName && <p className="font-semibold text-gray-700">{branding.locationName}</p>}
              {branding.locationAddress && <p>{branding.locationAddress}</p>}
              {branding.locationPhone && <p>{branding.locationPhone}</p>}
            </div>
            <p className="text-[11px] text-gray-400">Secure scheduling by nexhealth</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

  function startFilling() {
    if (!result) return;
    const idx = firstIncompleteIndex(result.forms);
    if (idx === null) {
      setStep("done");
      return;
    }
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

  function isVisible(field: PublicFormField, values: Answers): boolean {
    if (!field.conditionalFieldId) return true;
    return fieldValueMatches(values[field.conditionalFieldId], field.conditionalValue);
  }

  function validatePage(form: PublicForm, values: Answers, pageNum: number): string | null {
    const fields = form.fields.filter((f) => f.page === pageNum && isVisible(f, values));
    for (const f of fields) {
      if (!f.required || f.type === "content") continue;
      const v = values[f.id];
      const empty =
        v === undefined ||
        v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (f.type === "checkbox" && v !== true);
      if (empty) return `Please fill out "${f.label}" before continuing.`;
    }
    return null;
  }

  function handleFillNext() {
    if (!activeForm) return;
    const err = validatePage(activeForm, activeAnswers, page);
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
        toastSuccess("Form submitted");
        const updatedForms = result.forms.map((f, i) => (i === activeFormIdx ? { ...f, completed: true } : f));
        const updatedResult = { ...result, forms: updatedForms };
        setResult(updatedResult);
        const nextIdx = firstIncompleteIndex(updatedForms);
        if (nextIdx === null) {
          setStep("done");
        } else {
          setActiveFormIdx(nextIdx);
          setPage(1);
        }
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        const msg = apiErr?.detail || "Could not submit this form — please try again.";
        setFillError(msg);
        toastError(msg);
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
          <p className="text-base font-bold text-gray-900">This link isn't available</p>
          <p className="text-sm text-gray-500">{invalidReason}</p>
        </div>
      </BrandedShell>
    );
  }

  if (step === "verify") {
    return (
      <BrandedShell branding={branding}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">Verify patient details</h1>
        <p className="text-sm text-gray-500 text-center mb-5">Please confirm who you are to view your forms.</p>
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
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
              autoComplete="bday"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
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
    const fields = activeForm.fields.filter((f) => f.page === page && isVisible(f, activeAnswers));
    return (
      <BrandedShell branding={result}>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={handleFillBack} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={13} /> Back
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={15} className="text-gray-400 flex-shrink-0" />
          <h1 className="text-base font-bold text-gray-900 truncate">{activeForm.name}</h1>
        </div>
        {activeForm.pageCount > 1 && (
          <p className="text-xs font-semibold text-gray-400 mb-3">Page {page} of {activeForm.pageCount}</p>
        )}
        {fillError && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{fillError}</div>
        )}
        <div className="space-y-4 mb-6">
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing to fill out on this page.</p>
          ) : (
            fields.map((f) => (
              <PublicFieldInput
                key={f.id}
                field={f}
                value={activeAnswers[f.id]}
                onChange={(v) => setFieldValue(activeForm.requestId, f.id, v)}
              />
            ))
          )}
        </div>
        <button
          onClick={handleFillNext}
          disabled={submitting}
          className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {submitting ? "Submitting…" : page < activeForm.pageCount ? "Next" : "Submit"}
        </button>
      </BrandedShell>
    );
  }

  if (step === "done") {
    return (
      <BrandedShell branding={result}>
        <div className="text-center py-4 space-y-3">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-gray-900">You're all set</p>
          <p className="text-sm text-gray-500">Please reach out if you have any questions.</p>
        </div>
      </BrandedShell>
    );
  }

  return null;
}
