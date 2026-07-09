import { useState } from "react";
import { X, Info, ChevronDown } from "lucide-react";
import type { EligibilityStatus } from "../../types";

const ELIGIBILITY_OPTIONS: { value: EligibilityStatus; label: string }[] = [
  { value: "active",    label: "Active"    },
  { value: "self-pay",  label: "Self pay"  },
  { value: "inactive",  label: "Inactive"  },
  { value: "unknown",   label: "Unknown"   },
];

export function OverrideEligibilityStatusModal({ current, onClose, onSave }: {
  current: EligibilityStatus;
  onClose: () => void;
  onSave: (status: EligibilityStatus) => void;
}) {
  const [selected, setSelected] = useState<EligibilityStatus>(current === "unverified" ? "unknown" : current);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-bold text-gray-900">Override eligibility status</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></button>
        </div>

        {/* Blue info banner */}
        <div className="mx-6 mb-4 flex items-start gap-2.5 px-3.5 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">Status overrides are not automatically synced to your EHR</p>
        </div>

        <div className="px-6 pb-2">
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Status overrides persist until you manually update them or the patient's insurance is updated.
          </p>

          <p className="text-sm font-semibold text-gray-800 mb-2">Eligibility status</p>

          {/* Dropdown + option list */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Selected display */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
              <span className="text-sm font-medium text-gray-800">
                {ELIGIBILITY_OPTIONS.find(o => o.value === selected)?.label}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            {/* Options */}
            {ELIGIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                  selected === opt.value
                    ? "bg-teal-50 font-semibold text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 mt-4">
          <button onClick={() => onSave(selected)} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
