import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { publicPacketsApi } from "../lib/public-forms-api";
import type { PublicApiError } from "../lib/public-forms-api";
import { toastError, toastSuccess } from "../lib/toast";
import type { PublicPacketForm, PublicPacketInfo } from "../types";
import { BrandedShell, PublicFieldInput, isFieldVisible, validateFormPage, type Answers, type FieldValue } from "./sharedPublicUi";

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
        toastSuccess("Forms submitted");
        setStep("done");
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        const msg = apiErr?.detail || "Could not submit these forms — please try again.";
        setFillError(msg);
        toastError(msg);
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
          <p className="text-base font-bold text-gray-900">This link isn't available</p>
          <p className="text-sm text-gray-500">{invalidReason}</p>
        </div>
      </BrandedShell>
    );
  }

  if (step === "identify" && info) {
    return (
      <BrandedShell branding={info}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">{info.packetName}</h1>
        <p className="text-sm text-gray-500 text-center mb-5">Please tell us who you are to get started.</p>
        {identifyError && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{identifyError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" autoComplete="given-name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" autoComplete="family-name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Date of birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" autoComplete="bday" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Phone number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" autoComplete="tel" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" autoComplete="email" />
          </div>
          <button
            onClick={handleIdentify}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </BrandedShell>
    );
  }

  if (step === "list" && info) {
    return (
      <BrandedShell branding={info}>
        <h1 className="text-lg font-bold text-gray-900 text-center mb-1">Fill out your forms</h1>
        <p className="text-sm text-gray-500 text-center mb-5">Save time by completing all forms in this packet.</p>
        {forms.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">There are no forms in this packet right now.</p>
        ) : (
          <button
            onClick={startFilling}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <span className="text-sm font-semibold">Forms for {firstName} {lastName}</span>
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
      <BrandedShell branding={info}>
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
                medicalAlerts={activeForm.medicalAlerts}
                onChange={(v) => setFieldValue(activeForm.templateId, f.id, v)}
              />
            ))
          )}
        </div>
        <button
          onClick={handleFillNext}
          disabled={submitting}
          className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {submitting ? "Submitting…" : isLastPageOfLastForm ? "Submit" : "Next"}
        </button>
      </BrandedShell>
    );
  }

  if (step === "done") {
    return (
      <BrandedShell branding={info}>
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
