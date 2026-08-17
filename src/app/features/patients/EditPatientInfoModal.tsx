import { useState } from "react";
import { X, Lock, ChevronDown, UserRound } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import type { Patient } from "../../types";

export function EditPatientInfoModal({ patient, onClose, onSave }: {
  patient: Patient; onClose: () => void;
  onSave: (updated: Patient) => void;
}) {
  const [form, setForm] = useState({
    preferredName: patient.preferredName ?? `${patient.firstName} ${patient.lastName}`,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    address: patient.address ?? "",
    language: patient.language,
  });

  const lockedCls =
    "w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-500 bg-gray-50 border border-gray-200 flex items-center justify-between pointer-events-none select-none";
  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white placeholder:text-gray-400";
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5";

  function handleSave() {
    onSave({
      ...patient,
      preferredName: form.preferredName,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      address: form.address.trim(),
      language: form.language,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[2px] p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6 pb-5 border-b border-gray-100 bg-gradient-to-br from-teal-50 via-white to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <PatientAvatar initials={patient.initials} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 flex items-center gap-1.5">
                  <UserRound size={12} /> Edit profile
                </p>
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {patient.firstName} {patient.lastName}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{patient.dob}</p>
              </div>
            </div>
            <IconButton
              label="Close"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white transition-colors"
            >
              <X size={16} />
            </IconButton>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={labelCls}>First name</label>
                <div className={lockedCls}>
                  <span>{patient.firstName}</span>
                  <Lock size={13} className="text-gray-400" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Last name</label>
                <div className={lockedCls}>
                  <span>{patient.lastName}</span>
                  <Lock size={13} className="text-gray-400" />
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
                <div className={lockedCls}>
                  <span>{patient.dob}</span>
                  <Lock size={13} className="text-gray-400" />
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
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={labelCls}>Primary phone</label>
                <input
                  className={inputCls}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input
                  className={inputCls}
                  type="text"
                  placeholder="Street, city, state, ZIP"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
