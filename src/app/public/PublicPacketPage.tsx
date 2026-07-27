import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { publicPacketsApi } from "../lib/public-forms-api";
import type { PublicApiError } from "../lib/public-forms-api";
import type { PublicPacketForm, PublicPacketInfo } from "../types";
import { DobInput } from "./DobInput";
import {
  BrandedShell,
  PublicConfirmScreen,
  PublicFieldInput,
  PublicFormFillCard,
  isFieldVisible,
  validateFormPage,
  type Answers,
  type FieldValue,
} from "./sharedPublicUi";

type Step = "loading" | "invalid" | "identify" | "list" | "fill" | "submitting" | "done";

export function PublicPacketPage({ code }: { code: string }) {
  const [step, setStep] = useState<Step>("loading");
  const [info, setInfo] = useState<PublicPacketInfo | null>(null);
  const [invalidReason, setInvalidReason] = useState("This link isn't available.");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const [activeFormIdx, setActiveFormIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Record<string, Answers>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [fillError, setFillError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    publicPacketsApi
      .info(code)
      .then((r) => {
        setInfo(r);
        setStep("identify");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setInvalidReason(apiErr?.detail || "This link isn't available.");
        setStep("invalid");
      });
  }, [code]);

  function handleIdentify() {
    setIdentifyError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setIdentifyError("Please enter your first and last name.");
      return;
    }
    if (!dob) {
      setIdentifyError("Please enter your date of birth.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setIdentifyError("Please provide a phone number or email address.");
      return;
    }
    setStep("list");
  }

  const forms = info?.forms ?? [];
  const activeForm: PublicPacketForm | null = forms[activeFormIdx] ?? null;
  const activeAnswers = activeForm ? answers[activeForm.templateId] ?? {} : {};

  function setFieldValue(templateId: string, fieldId: string, v: FieldValue) {
    setAnswers((prev) => ({ ...prev, [templateId]: { ...(prev[templateId] ?? {}), [fieldId]: v } }));
  }

  function startFilling() {
    setActiveFormIdx(0);
    setPage(1);
    setFillError(null);
    setStep("fill");
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
    setCompletedIds((prev) => new Set(prev).add(activeForm.templateId));
    if (activeFormIdx < forms.length - 1) {
      setActiveFormIdx((i) => i + 1);
      setPage(1);
      return;
    }
    handleFinalSubmit();
  }

  function handleFillBack() {
    setFillError(null);
    if (page > 1) {
      setPage((p) => p - 1);
      return;
    }
    setStep("list");
  }

  function handleFinalSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setStep("submitting");
    publicPacketsApi
      .submit(code, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        phone: phone.trim(),
        email: email.trim(),
        submissions: forms.map((f) => ({ templateId: f.templateId, answers: answers[f.templateId] ?? {} })),
      })
      .then(() => {
        setStep("done");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setFillError(apiErr?.detail || "Could not submit these forms — please try again.");
        setStep("fill");
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

  if (step === "identify" && info) {
    return (
      <BrandedShell branding={info}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">Verify patient details</h1>
        <p className="text-sm text-gray-500 text-center mb-5">Please tell us who you are to get started.</p>
        {identifyError && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{identifyError}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Patient first name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
              autoComplete="given-name"
            />
          </div>
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
            <DobInput value={dob} onChange={setDob} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
              autoComplete="email"
            />
          </div>
          <button
            onClick={handleIdentify}
            disabled={!firstName.trim() || !lastName.trim() || !dob || (!phone.trim() && !email.trim())}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Submit
          </button>
        </div>
      </BrandedShell>
    );
  }

  if (step === "list" && info) {
    return (
      <BrandedShell branding={info}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">Fill out your forms</h1>
        <p className="text-sm text-gray-500 text-center mb-5">Save time on the day of your appointment by completing all forms.</p>
        {forms.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">There are no forms in this packet right now.</p>
        ) : (
          <button
            onClick={startFilling}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <span className="text-sm font-semibold">
              Forms for {firstName} {lastName}
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              {completedIds.size} of {forms.length}
              <ChevronRight size={16} />
            </span>
          </button>
        )}
      </BrandedShell>
    );
  }

  if ((step === "fill" || step === "submitting") && activeForm && info) {
    const fields = activeForm.fields.filter((f) => f.page === page && isFieldVisible(f, activeAnswers));
    const isLastPageOfLastForm = page === activeForm.pageCount && activeFormIdx === forms.length - 1;
    return (
      <PublicFormFillCard
        branding={info}
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
            {submitting ? "Submitting…" : isLastPageOfLastForm ? "Submit" : "Next"}
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
                  onChange={(v) => setFieldValue(activeForm.templateId, f.id, v)}
                />
              </div>
            ))
          )}
        </div>
      </PublicFormFillCard>
    );
  }

  if (step === "done") {
    return <PublicConfirmScreen branding={info} />;
  }

  return null;
}
