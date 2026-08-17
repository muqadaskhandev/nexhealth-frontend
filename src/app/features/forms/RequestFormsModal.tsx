import { useEffect, useState } from "react";
import {
  X,
  Search,
  FileText,
  Send,
  UserRound,
  MessageSquareText,
  Package,
} from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import { DatePicker, dateToIsoLocal, isoToLocalDate } from "../../components/shared/DatePicker";
import { staffApi, mapFormTemplate } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormPacket, FormTemplate, Patient } from "../../types";

const fieldShell =
  "flex items-center gap-2.5 px-3.5 py-3 border rounded-xl bg-white transition-shadow";
const fieldFocus = "border-teal-400 ring-2 ring-teal-100";
const fieldIdle = "border-gray-200 hover:border-gray-300";

export function RequestFormsModal({
  onClose,
  onSent,
  patients,
  templates,
  packets,
  initialPatient,
}: {
  onClose: () => void;
  onSent: () => void;
  patients: Patient[];
  templates: FormTemplate[];
  packets: FormPacket[];
  initialPatient?: Patient | null;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient ?? null);
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  const [formSearch, setFormSearch] = useState("");
  const [selectedForms, setSelectedForms] = useState<FormTemplate[]>([]);
  const [showFormDrop, setShowFormDrop] = useState(false);
  const [frequentForms, setFrequentForms] = useState<FormTemplate[]>([]);

  useEffect(() => {
    staffApi.forms.frequentTemplates().then((rows) => setFrequentForms(rows.map(mapFormTemplate)));
  }, []);

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);

  const [customizeMsg, setCustomizeMsg] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [intakeMode, setIntakeMode] = useState<"agent" | "form" | "both">("agent");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patientMatches = patients.filter((p) => {
    if (p.archived || patientSearch.length === 0) return false;
    const q = patientSearch.toLowerCase();
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    return (
      name.includes(q) ||
      p.dob.includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    );
  });

  const sortedTemplates = [...templates].sort((a, b) => a.name.localeCompare(b.name));
  const formMatches = sortedTemplates.filter(
    (t) =>
      formSearch.length > 0 &&
      t.name.toLowerCase().includes(formSearch.toLowerCase()) &&
      !selectedForms.some((f) => f.id === t.id)
  );

  function addForm(t: FormTemplate) {
    setSelectedForms((prev) => (prev.some((f) => f.id === t.id) ? prev : [...prev, t]));
    setFormSearch("");
    setShowFormDrop(false);
  }

  function removeForm(id: string) {
    setSelectedForms((prev) => prev.filter((f) => f.id !== id));
  }

  function addPacket(pkt: FormPacket) {
    const forms = pkt.formTemplateIds
      .map((id) => templates.find((t) => t.id === id))
      .filter((t): t is FormTemplate => Boolean(t));
    setSelectedForms((prev) => [...prev, ...forms.filter((t) => !prev.some((f) => f.id === t.id))]);
  }

  async function handleSend() {
    if (submitting) return;
    setError(null);
    if (!selectedPatient) {
      setError("Search for and select a patient to send to.");
      return;
    }
    if (selectedForms.length === 0) {
      setError("Select at least one form to send.");
      return;
    }
    const expiresAtDate = new Date(expiryDate);
    expiresAtDate.setHours(23, 59, 59, 999);
    if (expiresAtDate <= new Date()) {
      setError("Expiration date must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      await staffApi.forms.send({
        patientId: selectedPatient.id,
        formTemplateIds: selectedForms.map((f) => f.id),
        expiresAt: expiresAtDate.toISOString(),
        message: customizeMsg && smsMsg.trim() ? smsMsg.trim() : undefined,
        emailNote: customizeMsg && emailMsg.trim() ? emailMsg.trim() : undefined,
        intakeMode,
      });
      toastSuccess(
        `Sent ${selectedForms.length} form${selectedForms.length !== 1 ? "s" : ""} to ${selectedPatient.firstName} ${selectedPatient.lastName}`
      );
      onSent();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not send these forms — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const canSend = Boolean(selectedPatient) && selectedForms.length > 0 && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="send-forms-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-5 border-b border-gray-100 bg-gradient-to-r from-white to-teal-50/50 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-sm shadow-teal-500/25 flex-shrink-0">
            <Send size={18} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="send-forms-title" className="text-lg font-bold text-gray-900 tracking-tight">
              Send forms
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 leading-snug">
              Patient gets a link by SMS (and email note if you add one) to complete forms before their visit.
            </p>
          </div>
          <IconButton
            label="Close"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 flex-shrink-0"
          >
            <X size={18} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Patient */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <label className="text-sm font-semibold text-gray-900">Patient</label>
            </div>

            {selectedPatient ? (
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-teal-200 bg-teal-50/60">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {selectedPatient.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {[selectedPatient.dob, selectedPatient.phone, selectedPatient.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch("");
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 px-2 py-1 rounded-lg hover:bg-teal-100/80"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className={`${fieldShell} ${showPatientDrop ? fieldFocus : fieldIdle}`}>
                  <UserRound size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDrop(true);
                    }}
                    onFocus={() => setShowPatientDrop(true)}
                    placeholder="Search name, DOB, email, or phone"
                    className="flex-1 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-transparent"
                  />
                  <Search size={15} className="text-gray-300 flex-shrink-0" />
                </div>
                {showPatientDrop && patientSearch.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-52 overflow-y-auto">
                    {patientMatches.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">No patients found</p>
                    ) : (
                      patientMatches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch("");
                            setShowPatientDrop(false);
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-teal-50/60 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-800 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {p.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {p.firstName} {p.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {[p.dob, p.phone].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Forms */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <label className="text-sm font-semibold text-gray-900">Forms</label>
              </div>
              {selectedForms.length > 0 && (
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                  {selectedForms.length} selected
                </span>
              )}
            </div>

            <div className="relative">
              <div className={`${fieldShell} ${showFormDrop ? fieldFocus : fieldIdle}`}>
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  value={formSearch}
                  onChange={(e) => {
                    setFormSearch(e.target.value);
                    setShowFormDrop(true);
                  }}
                  onFocus={() => setShowFormDrop(true)}
                  placeholder="Search forms to add…"
                  className="flex-1 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-transparent"
                />
                <Search size={15} className="text-gray-300 flex-shrink-0" />
              </div>
              {showFormDrop && formSearch.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {formMatches.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">No matching forms</p>
                  ) : (
                    formMatches.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addForm(t)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-teal-50/60 transition-colors text-left"
                      >
                        <FileText size={14} className="text-teal-500 flex-shrink-0" />
                        <span className="text-sm text-gray-800">{t.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedForms.length > 0 && (
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {selectedForms.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{t.name}</span>
                    <IconButton
                      label="Remove"
                      onClick={() => removeForm(t.id)}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex-shrink-0"
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            {frequentForms.filter((t) => !selectedForms.some((f) => f.id === t.id)).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                  Frequently sent
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {frequentForms
                    .filter((t) => !selectedForms.some((f) => f.id === t.id))
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => addForm(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                      >
                        <span className="text-teal-500 font-bold">+</span>
                        {t.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {packets.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
                  <Package size={11} /> Packets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {packets.map((pkt) => (
                    <button
                      key={pkt.id}
                      type="button"
                      onClick={() => addPacket(pkt)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors"
                    >
                      <span>+</span>
                      {pkt.name}
                      <span className="font-normal text-teal-600/80">
                        ({pkt.formTemplateIds.length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Expiration */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <label className="text-sm font-semibold text-gray-900">Expires</label>
            </div>
            <div className="space-y-1.5">
              <DatePicker
                value={dateToIsoLocal(expiryDate)}
                min={dateToIsoLocal(new Date())}
                onChange={(iso) => {
                  const next = isoToLocalDate(iso);
                  if (next) setExpiryDate(next);
                }}
                aria-label="Form expiration date"
              />
              <p className="text-xs text-gray-400">Defaults to 7 days from today.</p>
              <button
                type="button"
                onClick={() => {
                  const next = new Date();
                  next.setDate(next.getDate() + 7);
                  setExpiryDate(next);
                }}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Reset to 7 days
              </button>
            </div>
          </section>

          {/* Intake delivery */}
          <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">How should the patient complete this?</p>
            <p className="text-xs text-gray-500 mb-3">
              Email is sent automatically via SES when the patient has an email on file.
            </p>
            <div className="space-y-2">
              {(
                [
                  ["agent", "Chat intake (Angelina)", "Recommended — guided conversation"],
                  ["form", "Classic form", "Traditional multi-field form"],
                  ["both", "Chat + classic form", "Send both links"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    intakeMode === value
                      ? "border-teal-500 bg-white shadow-sm"
                      : "border-gray-200 bg-white/70 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="intakeMode"
                    value={value}
                    checked={intakeMode === value}
                    onChange={() => setIntakeMode(value)}
                    className="mt-1 accent-teal-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{label}</span>
                    <span className="block text-xs text-gray-500">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Customize message */}
          <section
            className={`rounded-2xl border transition-colors ${
              customizeMsg ? "border-teal-200 bg-teal-50/40 p-4" : "border-gray-200 bg-gray-50/50 p-4"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    customizeMsg ? "bg-teal-500 text-white" : "bg-white border border-gray-200 text-gray-500"
                  }`}
                >
                  <MessageSquareText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Customize message</p>
                  <p className="text-xs text-gray-500">Optional SMS / email note with the form link</p>
                </div>
              </div>
              <Toggle on={customizeMsg} onChange={setCustomizeMsg} />
            </div>

            {customizeMsg && (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-600">SMS message</label>
                    <span className="text-[11px] font-medium text-teal-600">{smsMsg.length} chars</span>
                  </div>
                  <textarea
                    value={smsMsg}
                    onChange={(e) => setSmsMsg(e.target.value)}
                    rows={2}
                    placeholder={`Hi ${selectedPatient?.firstName || "there"}! Please fill out these forms before your visit.`}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none bg-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email note</label>
                  <input
                    value={emailMsg}
                    onChange={(e) => setEmailMsg(e.target.value)}
                    placeholder="Optional extra note for email"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex-shrink-0">
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white shadow-sm shadow-teal-500/20 disabled:shadow-none"
          >
            <Send size={15} />
            {submitting
              ? "Sending…"
              : `Send${selectedForms.length > 0 ? ` ${selectedForms.length} form${selectedForms.length !== 1 ? "s" : ""}` : ""}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 px-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
