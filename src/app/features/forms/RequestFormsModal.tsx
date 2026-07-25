import { useEffect, useState } from "react";
import { X, Search, Info, Calendar, ChevronLeft, ChevronRight, Edit, FileText } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi, mapFormTemplate } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormTemplate, Patient } from "../../types";

function MiniCalendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [viewDate, setViewDate] = useState(new Date(value));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72 z-50">
      <div className="flex items-center justify-between mb-3">
        <IconButton label="Previous month" onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"><ChevronLeft size={16} /></IconButton>
        <span className="text-sm font-bold text-gray-900">{monthName} {year}</span>
        <IconButton label="Next month" onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"><ChevronRight size={16} /></IconButton>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = value.getDate() === day && value.getMonth() === month && value.getFullYear() === year;
          return (
            <button
              key={day}
              onClick={() => onChange(new Date(year, month, day))}
              className={`w-9 h-9 flex items-center justify-center text-sm rounded-full mx-auto transition-colors ${
                isSelected ? "bg-gray-900 text-white font-bold" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RequestFormsModal({
  onClose,
  onSent,
  patients,
  templates,
}: {
  onClose: () => void;
  onSent: () => void;
  patients: Patient[];
  templates: FormTemplate[];
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
  const [showCalendar, setShowCalendar] = useState(false);

  const [customizeMsg, setCustomizeMsg] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patientMatches = patients.filter(p =>
    !p.archived && patientSearch.length > 0 &&
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const sortedTemplates = [...templates].sort((a, b) => a.name.localeCompare(b.name));
  const formMatches = sortedTemplates.filter(t =>
    formSearch.length > 0 && t.name.toLowerCase().includes(formSearch.toLowerCase()) && !selectedForms.some(f => f.id === t.id)
  );

  const fmtExpiry = expiryDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function addForm(t: FormTemplate) {
    setSelectedForms(prev => (prev.some(f => f.id === t.id) ? prev : [...prev, t]));
    setFormSearch("");
    setShowFormDrop(false);
  }

  function removeForm(id: string) {
    setSelectedForms(prev => prev.filter(f => f.id !== id));
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
        formTemplateIds: selectedForms.map(f => f.id),
        expiresAt: expiresAtDate.toISOString(),
        message: customizeMsg && smsMsg.trim() ? smsMsg.trim() : undefined,
        emailNote: customizeMsg && emailMsg.trim() ? emailMsg.trim() : undefined,
      });
      toastSuccess(`Sent ${selectedForms.length} form${selectedForms.length !== 1 ? "s" : ""} to ${selectedPatient.firstName} ${selectedPatient.lastName}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">New form request</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Patients will receive an email and text message with a link to fill out these forms.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0"><X size={18} /></IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-5">
          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          {/* Send to */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Send to</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors ${showPatientDrop ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-200"}`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); setShowPatientDrop(true); }}
                  onFocus={() => setShowPatientDrop(true)}
                  placeholder="Search by name, date of birth, email, or phone"
                  className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
                />
                {selectedPatient && <IconButton label="Clear" onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="text-gray-400 hover:text-gray-600"><X size={13} /></IconButton>}
              </div>
              {showPatientDrop && patientMatches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {patientMatches.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(""); setShowPatientDrop(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-gray-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{p.initials}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-gray-400">{p.dob}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Find an existing patient by name, date of birth, email, or phone</p>
          </div>

          {/* Forms */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Forms</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors ${showFormDrop ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-200"}`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={formSearch}
                  onChange={e => { setFormSearch(e.target.value); setShowFormDrop(true); }}
                  onFocus={() => setShowFormDrop(true)}
                  placeholder="Choose forms"
                  className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
                />
              </div>
              {showFormDrop && formMatches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {formMatches.map(t => (
                    <button key={t.id} onClick={() => addForm(t)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected forms */}
            {selectedForms.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedForms.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{t.name}</span>
                    </div>
                    <IconButton label="Remove" onClick={() => removeForm(t.id)} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"><X size={13} /></IconButton>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-add pills — most commonly sent forms */}
            {frequentForms.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {frequentForms.filter(t => !selectedForms.some(f => f.id === t.id)).map(t => (
                  <button key={t.id} onClick={() => addForm(t)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                    <span className="text-teal-500">+</span> {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expiration date */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm font-bold text-gray-900">Expiration date</label>
              <Info size={13} className="text-gray-400" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Calendar size={14} className="text-gray-400" />
                  {fmtExpiry}
                </div>
                <IconButton label="Edit" onClick={() => setShowCalendar(v => !v)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit size={14} />
                </IconButton>
              </div>
              <p className="text-xs text-gray-400 mt-1">Defaults to 7 days from today.</p>
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <MiniCalendar value={expiryDate} onChange={d => { setExpiryDate(d); setShowCalendar(false); }} />
                </div>
              )}
              {showCalendar && (
                <button onClick={() => { setExpiryDate(defaultExpiry); setShowCalendar(false); }} className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors">Reset</button>
              )}
            </div>
          </div>

          {/* Customize message */}
          <div className={`rounded-xl border transition-colors ${customizeMsg ? "border-gray-200 bg-gray-50 p-4" : "p-0"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Customize message</span>
              <Toggle on={customizeMsg} onChange={setCustomizeMsg} />
            </div>

            {customizeMsg && (
              <div className="mt-4 space-y-4">
                {/* SMS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-gray-800">SMS message</label>
                    <span className="text-xs font-medium text-teal-600">{smsMsg.length} characters</span>
                  </div>
                  <textarea
                    value={smsMsg}
                    onChange={e => setSmsMsg(e.target.value)}
                    rows={2}
                    placeholder={`Good morning, ${selectedPatient?.firstName || "Patient"}! Please fill out these forms.`}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 resize-none bg-white placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Customize the text sent out. Leave blank for the default message.</p>
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Email</label>
                  <input
                    value={emailMsg}
                    onChange={e => setEmailMsg(e.target.value)}
                    placeholder={selectedPatient?.email || "Additional note for the email"}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 bg-white placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Add additional notes to emails when patients follow the link.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            disabled={submitting}
            onClick={handleSend}
            className="px-6 py-2.5 text-sm font-bold rounded-xl transition-colors bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
