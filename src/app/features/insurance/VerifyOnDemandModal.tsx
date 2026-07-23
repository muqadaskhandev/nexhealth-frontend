import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import type { Patient, InsuranceData } from "../../types";

const INSURERS = [
  "Aetna", "Anthem", "Blue Cross Blue Shield", "Cigna", "Humana",
  "Kaiser Permanente", "MetLife", "United Healthcare", "Delta Dental", "Guardian",
];

export function VerifyOnDemandModal({ patient, onClose, onVerified }: {
  patient: Patient;
  onClose: () => void;
  onVerified: (data: InsuranceData) => void;
}) {
  const [form, setForm] = useState({
    insuranceName: "",
    memberId: "",
    groupNumber: "",
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dob,
    providerName: `Dr. ${patient.provider}`,
    npi: "1234567890",
    taxId: "",
    isDependent: false,
    advancedOpen: false,
  });

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

  function handleVerify() {
    if (!form.insuranceName) return;
    onVerified({
      status: "active",
      name: form.insuranceName,
      memberId: form.memberId || "U12345678901",
      planDates: "01/01/2025 - 12/31/2025",
      payerId: "12345",
      verifiedOn: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
      pdfSyncedOn: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
      dataSource: "On Demand Verification",
      providerName: patient.provider,
      npi: form.npi,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Verify on demand</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></IconButton>
        </div>

        {/* Teal info banner */}
        <div className="mx-6 mb-4 p-4 bg-teal-50 border border-teal-200 rounded-xl flex-shrink-0">
          <p className="text-sm font-bold text-gray-900 mb-1">Capture Insurance Directly From Your Patients</p>
          <p className="text-xs text-gray-600 leading-relaxed">Automatically verify patients before they arrive with our new dental insurance form. It's included in your Forms and Verification package, so get started today!</p>
          <button className="text-xs font-semibold text-teal-600 hover:text-teal-700 mt-1.5 transition-colors">Learn more</button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-4">
          {/* Insurance name */}
          <div>
            <label className={labelCls}>Insurance name</label>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none cursor-pointer`}
                value={form.insuranceName}
                onChange={e => setForm(f => ({ ...f, insuranceName: e.target.value }))}
              >
                <option value="" disabled>Insurance name</option>
                {INSURERS.map(ins => <option key={ins} value={ins}>{ins}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1">This list includes only insurers that offer automatic verification.</p>
          </div>

          {/* Member ID + Group number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Patient member ID</label>
              <input className={inputCls} placeholder="Patient member ID" value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} />
            </div>
            <div>
              <label className={`${labelCls} flex items-center gap-1`}>
                Group number <span className="text-teal-500 font-medium text-[10px]">Optional</span>
              </label>
              <input className={inputCls} placeholder="Group number" value={form.groupNumber} onChange={e => setForm(f => ({ ...f, groupNumber: e.target.value }))} />
            </div>
          </div>

          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Patient first name</label>
              <input className={inputCls} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Patient last name</label>
              <input className={inputCls} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className={labelCls}>Patient date of birth</label>
            <input className={inputCls} value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          </div>

          {/* Provider name */}
          <div>
            <label className={labelCls}>Provider or organization name</label>
            <input className={inputCls} value={form.providerName} onChange={e => setForm(f => ({ ...f, providerName: e.target.value }))} />
          </div>

          {/* NPI */}
          <div>
            <label className={labelCls}>Provider or organization NPI</label>
            <input className={inputCls} value={form.npi} onChange={e => setForm(f => ({ ...f, npi: e.target.value }))} />
          </div>

          {/* Tax ID */}
          <div>
            <label className={`${labelCls} flex items-center gap-1`}>
              Tax ID <span className="text-teal-500 font-medium text-[10px]">Optional</span>
            </label>
            <input className={inputCls} placeholder="" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
          </div>

          {/* Dependent toggle */}
          <div className="flex items-start justify-between gap-3 py-1">
            <div>
              <p className="text-sm font-semibold text-gray-800">Patient is a dependent</p>
              <p className="text-xs text-gray-400 mt-0.5">Toggle on to add subscriber details</p>
            </div>
            <Toggle on={form.isDependent} onChange={v => setForm(f => ({ ...f, isDependent: v }))} />
          </div>

          {/* Advanced */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setForm(f => ({ ...f, advancedOpen: !f.advancedOpen }))}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">Advanced</p>
                <p className="text-xs text-gray-400">You can add payer portal credentials below</p>
              </div>
              <ChevronDown size={15} className={`text-gray-400 transition-transform ${form.advancedOpen ? "rotate-180" : ""}`} />
            </button>
            {form.advancedOpen && (
              <div className="mt-3 space-y-3">
                <input className={inputCls} placeholder="Payer portal username" />
                <input className={inputCls} placeholder="Payer portal password" type="password" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleVerify} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Verify</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
