import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText, MoreHorizontal } from "lucide-react";
import { VerifyOnDemandModal } from "./VerifyOnDemandModal";
import { OverrideEligibilityStatusModal } from "./OverrideEligibilityStatusModal";
import { IconButton } from "../../components/shared/IconButton";
import type { Patient, InsuranceData, EligibilityStatus } from "../../types";

export function InsuranceAccordion({ patient, onSavePatient }: {
  patient: Patient;
  onSavePatient: (p: Patient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [ellipsisOpen, setEllipsisOpen] = useState(false);
  const ellipsisRef = useRef<HTMLDivElement>(null);
  const ins = patient.insuranceData;

  useEffect(() => {
    if (!ellipsisOpen) return;
    const handler = (e: MouseEvent) => { if (ellipsisRef.current && !ellipsisRef.current.contains(e.target as Node)) setEllipsisOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ellipsisOpen]);

  // Derive summary label and badge
  const summaryName = ins ? (ins.status === "self-pay" ? "Self Pay" : ins.status === "inactive" ? "Inactive" : ins.name) : "Unknown";
  const badge = !ins || ins.status === "unknown" || ins.status === "unverified"
    ? <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded font-medium">Unverified</span>
    : ins.status === "active"
    ? <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded font-medium">Active</span>
    : ins.status === "self-pay"
    ? <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded font-medium">Self Pay</span>
    : ins.status === "inactive"
    ? <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 border border-red-200 rounded font-medium">Inactive</span>
    : <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded font-medium">Unverified</span>;

  function handleVerified(data: InsuranceData) {
    onSavePatient({ ...patient, insuranceData: data });
  }

  function handleOverrideSave(status: EligibilityStatus) {
    const name = status === "active" ? (ins?.name || "Active") : status === "self-pay" ? "Self Pay" : status === "inactive" ? "Inactive" : "Unknown";
    onSavePatient({ ...patient, insuranceData: { ...(ins ?? { name }), status, name, overridden: true } });
    setShowOverrideModal(false);
  }

  function handleChangeStatus() {
    setShowOverrideModal(true);
  }

  return (
    <>
      <div>
        {/* Header row */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Insurance Eligibility</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-gray-900">{summaryName}</p>
              {badge}
            </div>
          </div>
          <ChevronDown size={15} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Expanded: Active */}
        {open && ins?.status === "active" && (
          <div className="border-t border-border">
            {/* Details grid */}
            <div className="px-4 py-4 space-y-2.5">
              {[
                { label: "Member ID",               value: ins.memberId },
                { label: "Plan dates",               value: ins.planDates },
                { label: "Payer ID",                 value: ins.payerId },
                { label: "Verified on",              value: ins.verifiedOn },
                { label: "PDF synced on",            value: ins.pdfSyncedOn },
                { label: "Patient/Payer data source",value: ins.dataSource },
              ].map(row => row.value && (
                <div key={row.label} className="grid grid-cols-2 gap-2 text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="font-semibold text-gray-800">{row.label}</span>
                  <span className="text-gray-600">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Provider section */}
            {(ins.providerName || ins.npi) && (
              <div className="px-4 pb-4 space-y-2.5 border-t border-gray-100 pt-3">
                {ins.providerName && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="font-semibold text-gray-800">Provider name</span>
                    <span className="text-gray-600">{ins.providerName}</span>
                  </div>
                )}
                {ins.npi && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="font-semibold text-gray-800">NPI</span>
                    <span className="text-gray-600">{ins.npi}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer row: PDF link + ellipsis */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-gray-50/40">
              <button className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                <FileText size={15} />
                View Eligibility PDF
              </button>
              <div ref={ellipsisRef} className="relative">
                <IconButton
                  label="More"
                  onClick={() => setEllipsisOpen(v => !v)}
                  className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal size={16} />
                </IconButton>
                {ellipsisOpen && (
                  <div className="absolute bottom-full right-0 mb-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1">
                    <button onClick={() => { setShowVerifyModal(true); setEllipsisOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Re-verify eligibility</button>
                    <button onClick={() => { handleChangeStatus(); setEllipsisOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50">Remove insurance</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expanded: Unknown / Unverified / Pending — both action buttons */}
        {open && (!ins || ins.status === "unverified" || ins.status === "unknown") && (
          <div className="border-t border-border px-4 py-4">
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Patient's insurance details are missing from your health record system.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleChangeStatus}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Change Eligibility Status
              </button>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Verify eligibility on-demand
              </button>
            </div>
          </div>
        )}

        {/* Expanded: Self Pay / Inactive override */}
        {open && ins && (ins.status === "self-pay" || ins.status === "inactive") && (
          <div className="border-t border-border px-4 py-4">
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {ins.status === "self-pay"
                ? "This patient is set to self-pay. No insurance verification is required."
                : "This patient's insurance is inactive."}
              {ins.overridden && <span className="block text-xs text-gray-400 mt-1">Status was manually overridden.</span>}
            </p>
            <button
              onClick={handleChangeStatus}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Change Eligibility Status
            </button>
          </div>
        )}
      </div>

      {showVerifyModal && (
        <VerifyOnDemandModal
          patient={patient}
          onClose={() => setShowVerifyModal(false)}
          onVerified={handleVerified}
        />
      )}
      {showOverrideModal && (
        <OverrideEligibilityStatusModal
          current={ins?.status ?? "unknown"}
          onClose={() => setShowOverrideModal(false)}
          onSave={handleOverrideSave}
        />
      )}
    </>
  );
}
