import { useState } from "react";
import { X, Lock, ChevronDown } from "lucide-react";
import { emailError, formatPhoneInput, phoneError } from "../../lib/fieldFormat";
import type { Patient } from "../../types";

export function EditPatientInfoModal({
  patient,
  onClose,
  onSave,
}: {
  patient: Patient;
  onClose: () => void;
  onSave: (updated: Patient) => void;
}) {
  const [form, setForm] = useState({
    preferredName: patient.preferredName ?? `${patient.firstName} ${patient.lastName}`,
    gender: patient.gender,
    phone: formatPhoneInput(patient.phone || ""),
    email: patient.email,
    address: patient.address || "",
    provider: patient.provider || "",
    language: patient.language,
  });
  const [error, setError] = useState<string | null>(null);

  const lockedInputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-100 flex items-center justify-between pointer-events-none select-none";
  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white placeholder:text-gray-400";
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = "block text-sm font-semibold text-gray-900 mb-1.5";

  function handleSave() {
    const fieldError =
      emailError(form.email, { required: true }) ||
      phoneError(form.phone, { required: true });
    if (fieldError) {
      setError(fieldError);
      return;
    }
    onSave({
      ...patient,
      preferredName: form.preferredName,
      gender: form.gender,
      phone: form.phone,
      email: form.email.trim(),
      address: form.address.trim() || undefined,
      provider: form.provider || patient.provider,
      language: form.language,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit patient info</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-2 space-y-4 flex-1">
          {error && (
            <div className="px-3.5 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label className={labelCls}>First name</label>
            <div className={lockedInputCls}>
              <span>{patient.firstName}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <div className={lockedInputCls}>
              <span>{patient.lastName}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Preferred name</label>
            <input
              className={inputCls}
              value={form.preferredName}
              onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Date of birth</label>
            <div className={lockedInputCls}>
              <span>{patient.dob}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <div className="relative">
              <select
                className={selectCls}
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Primary phone</label>
            <input
              className={inputCls}
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              className={inputCls}
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street address"
              autoComplete="street-address"
            />
          </div>
          <div>
            <label className={labelCls}>Provider</label>
            <div className="relative">
              <select
                className={selectCls}
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              >
                <option value="" disabled>
                  Provider
                </option>
                <option value="Nick Riviera">Nick Riviera</option>
                <option value="Beverly Crusher">Beverly Crusher</option>
                <option value="Leonard McCoy">Leonard McCoy</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Preferred language</label>
            <div className="relative">
              <select
                className={selectCls}
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              >
                <option value="" disabled>
                  Preferred language
                </option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Mandarin">Mandarin</option>
                <option value="Portuguese">Portuguese</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
