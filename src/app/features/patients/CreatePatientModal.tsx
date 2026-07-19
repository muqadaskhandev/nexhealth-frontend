import { useRef, useState } from "react";
import { X, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Lock, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import type { Patient } from "../../types";

function formatDobDisplay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function parseDobToDate(input: string): Date | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!m) return undefined;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return undefined;
  return d;
}

function DobCalendar({
  value,
  onChange,
}: {
  value?: Date;
  onChange: (d: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(() => value ?? new Date(today.getFullYear() - 25, today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-900">{monthName}</span>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year - 1, month, 1))}
            className="p-0.5 rounded hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-bold text-teal-600 tabular-nums w-10 text-center">{year}</span>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year + 1, month, 1))}
            className="p-0.5 rounded hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors"
            aria-label="Next year"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          const isFuture = date > today;
          const isSelected =
            !!value &&
            value.getDate() === day &&
            value.getMonth() === month &&
            value.getFullYear() === year;
          const isToday = date.getTime() === today.getTime() && !isSelected;
          return (
            <button
              key={day}
              type="button"
              disabled={isFuture}
              onClick={() => onChange(date)}
              className={`w-9 h-9 flex items-center justify-center text-sm rounded-full mx-auto transition-colors ${
                isSelected
                  ? "bg-teal-500 text-white font-bold shadow-sm"
                  : isFuture
                    ? "text-gray-300 cursor-not-allowed"
                    : isToday
                      ? "text-teal-600 font-semibold ring-1 ring-teal-300 hover:bg-teal-50"
                      : "text-gray-700 hover:bg-teal-50 hover:text-teal-700"
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

export function CreatePatientModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Partial<Patient>) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    phone: "",
    provider: "",
    dob: "",
    language: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDobCalendar, setShowDobCalendar] = useState(false);
  const savingRef = useRef(false);

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob || "—",
        gender: form.gender || "—",
        email: form.email,
        phone: form.phone,
        provider: form.provider || "Nick Riviera",
        language: form.language || "English",
      });
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not create patient — please check the fields and try again.");
      savingRef.current = false;
      setSubmitting(false);
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";
  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Create new patient</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={16} /></button>
        </div>
        <div className="mx-6 mb-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">This does not create a patient in your health record system</p>
        </div>
        {error && (
          <div className="mx-6 mb-4 flex items-start gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <div className="px-6 pb-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <input className={inputCls} placeholder="First name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          <input className={inputCls} placeholder="Last name"  value={form.lastName}  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          <div className="relative">
            <select className={selectCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="" disabled>Gender</option>
              <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <input className={inputCls} placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ paddingRight: "2.5rem" }} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center pointer-events-none">
              <Lock size={11} className="text-white" />
            </div>
          </div>
          <input className={inputCls} placeholder="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div className="relative">
            <select className={selectCls} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
              <option value="" disabled>Provider</option>
              <option>Nick Riviera</option><option>Beverly Crusher</option><option>Leonard McCoy</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Date of birth</label>
            <Popover open={showDobCalendar} onOpenChange={setShowDobCalendar}>
              <div className="relative">
                <input
                  className={inputCls}
                  placeholder="MM/DD/YYYY"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  style={{ paddingRight: "2.75rem" }}
                />
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-teal-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                    aria-label="Open calendar"
                  >
                    <Calendar size={16} />
                  </button>
                </PopoverTrigger>
              </div>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-auto p-4 rounded-2xl border-gray-100 shadow-xl bg-white"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <DobCalendar
                  value={parseDobToDate(form.dob)}
                  onChange={(d) => {
                    setForm((f) => ({ ...f, dob: formatDobDisplay(d) }));
                    setShowDobCalendar(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Preferred language</label>
            <div className="relative">
              <select className={selectCls} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="" disabled>Preferred language</option>
                <option>English</option><option>Spanish</option><option>French</option><option>Mandarin</option><option>Portuguese</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={submitting} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors">
            {submitting ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
