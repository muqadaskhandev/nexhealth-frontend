import { useState } from "react";
import { X, AlertTriangle, ChevronDown, Lock } from "lucide-react";
import type { Patient } from "../../types";

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

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || submitting) return;
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
    } finally {
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
            <input className={inputCls} placeholder="MM/DD/YYYY" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
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
