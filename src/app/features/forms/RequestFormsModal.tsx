import { useState } from "react";
import { X, Search, Info, Calendar, ChevronLeft, ChevronRight, ChevronDown, Edit, FileText } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import { MANAGE_FORMS } from "./forms-data";
import type { Patient } from "../../types";

const QUICK_ADD_PACKETS = ["New Patient", "Quick Session", "Returning Patient"];

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
  patients,
}: {
  onClose: () => void;
  patients: Patient[];
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  const [formSearch, setFormSearch] = useState("");
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [showFormDrop, setShowFormDrop] = useState(false);

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [showCalendar, setShowCalendar] = useState(false);

  const [customizeMsg, setCustomizeMsg] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  const patientMatches = patients.filter(p =>
    !p.archived && patientSearch.length > 0 &&
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const formMatches = MANAGE_FORMS.filter(f =>
    formSearch.length > 0 && f.toLowerCase().includes(formSearch.toLowerCase()) && !selectedForms.includes(f)
  );

  const canSend = selectedPatient.length > 0 && selectedForms.length > 0;

  const fmtExpiry = expiryDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function addForm(f: string) {
    setSelectedForms(prev => prev.includes(f) ? prev : [...prev, f]);
    setFormSearch("");
    setShowFormDrop(false);
  }

  function addQuickAdd(label: string) {
    const map: Record<string, string[]> = {
      "New Patient": ["Patient Information Form", "Medical History Form", "HIPAA Notice"],
      "Quick Session": ["Consent for Internet Communications"],
      "Returning Patient": ["Dental History Form", "Credit Card Authorization Form"],
    };
    (map[label] ?? []).forEach(f => setSelectedForms(prev => prev.includes(f) ? prev : [...prev, f]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">New form request</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Patients will receive an email and text message from your{" "}
              <button className="text-blue-600 underline">form request template</button>.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0"><X size={18} /></IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-5">

          {/* Send to */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Send to</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors ${showPatientDrop ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-200"}`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={selectedPatient || patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(""); setShowPatientDrop(true); }}
                  onFocus={() => setShowPatientDrop(true)}
                  placeholder="Search by name, date of birth, email, or phone"
                  className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
                />
                {selectedPatient && <IconButton label="Clear" onClick={() => { setSelectedPatient(""); setPatientSearch(""); }} className="text-gray-400 hover:text-gray-600"><X size={13} /></IconButton>}
              </div>
              {showPatientDrop && patientMatches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {patientMatches.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPatient(`${p.firstName} ${p.lastName}`); setPatientSearch(""); setShowPatientDrop(false); }}
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
            <p className="text-xs text-gray-400 mt-1">Find an existing patient or send to a phone/email address</p>
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
                  {formMatches.map(f => (
                    <button key={f} onClick={() => addForm(f)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{f}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected forms */}
            {selectedForms.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedForms.map(f => (
                  <div key={f} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                    <IconButton label="Remove" onClick={() => setSelectedForms(prev => prev.filter(x => x !== f))} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={13} /></IconButton>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-add pills */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {QUICK_ADD_PACKETS.map(label => (
                <button key={label} onClick={() => addQuickAdd(label)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <span className="text-teal-500">+</span> {label}
                </button>
              ))}
            </div>
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
              <p className="text-xs text-gray-400 mt-1">
                Set by your default expiration date.{" "}
                <button className="text-blue-500 hover:underline">Update settings</button>
              </p>
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
                    placeholder={`Good morning, ${selectedPatient.split(" ")[0] || "Patient"}! Please fill out these forms.`}
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
                    placeholder={selectedPatient ? `${selectedPatient.toLowerCase().replace(" ", "")}@email.com` : "Email address"}
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
            disabled={!canSend}
            onClick={onClose}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-colors ${canSend ? "bg-teal-500 hover:bg-teal-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            Send
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
