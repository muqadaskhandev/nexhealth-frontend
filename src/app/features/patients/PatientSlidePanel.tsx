import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, CircleDollarSign } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { SyncTooltip } from "../../components/shared/SyncTooltip";
import { InsuranceAccordion } from "../insurance/InsuranceAccordion";
import { EditPatientInfoModal } from "./EditPatientInfoModal";
import { EditNotificationPreferencesModal } from "./EditNotificationPreferencesModal";
import type { Patient, HistoryItem } from "../../types";

const PATIENT_HISTORY: HistoryItem[] = [
  { id: "h1", amount: "$100.00", date: "Dec 3, 2024",  time: "12:06 PM" },
  { id: "h2", amount: "$40.00",  date: "Dec 2, 2024",  time: "8:21 PM"  },
  { id: "h3", amount: "$75.00",  date: "Nov 15, 2024", time: "3:45 PM"  },
];

export function PatientSlidePanel({ patient, onClose, onSavePatient }: {
  patient: Patient; onClose: () => void;
  onSavePatient: (p: Patient) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "messages" | "appointments">("history");
  const [accordion, setAccordion] = useState<Record<string, boolean>>({
    insurance: false, forms: false, appointment: false, payments: false,
  });
  const [modal, setModal] = useState<"editInfo" | "notificationPrefs" | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e: MouseEvent) => { if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionsOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleAccordion = (key: string) => setAccordion(prev => ({ ...prev, [key]: !prev[key] }));

  function handleArchiveToggle() {
    setActionsOpen(false);
    onSavePatient({ ...patient, archived: !patient.archived });
  }

  const ACTIONS: { label: string; onClick: () => void; danger?: boolean }[] = [
    { label: "Request forms",            onClick: () => setActionsOpen(false) },
    { label: "Collect payment",          onClick: () => setActionsOpen(false) },
    { label: "Edit patient info",        onClick: () => { setActionsOpen(false); setModal("editInfo"); } },
    { label: "Manage payment methods",   onClick: () => setActionsOpen(false) },
    { label: "Notification preferences", onClick: () => { setActionsOpen(false); setModal("notificationPrefs"); } },
    { label: patient.archived ? "Unarchive patient" : "Archive patient", onClick: handleArchiveToggle, danger: !patient.archived },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[540px] bg-white shadow-2xl z-40 flex flex-col overflow-hidden">

        {/* ── Patient header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <PatientAvatar initials={patient.initials} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{patient.firstName} {patient.lastName}</h2>
                  {patient.archived && (
                    <span className="px-2 py-0.5 text-xs font-medium border border-pink-400 text-pink-600 rounded flex-shrink-0">Archived</span>
                  )}
                  {!patient.synced && <SyncTooltip />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{patient.dob} · {patient.gender}</p>
                <p className="text-xs text-gray-500">{patient.email}</p>
                <p className="text-xs text-gray-500">{patient.phone}</p>
                <p className="text-xs text-gray-500">Language: {patient.language}</p>
              </div>
            </div>

            {/* Actions + Unarchive + Close */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div ref={actionsRef} className="relative">
                <button
                  onClick={() => setActionsOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors ${actionsOpen ? "border-teal-400 bg-teal-50 text-teal-700" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
                >
                  Actions <ChevronDown size={13} />
                </button>
                {actionsOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                    {ACTIONS.map(action => (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${action.danger ? "text-red-500" : "text-gray-700"}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Accordion sections */}
          <div className="mx-4 mb-4 bg-white border border-border rounded-xl overflow-hidden">
            {/* Insurance Eligibility — rich component */}
            <div className="border-b border-border">
              <InsuranceAccordion patient={patient} onSavePatient={onSavePatient} />
            </div>

            {/* Forms */}
            <div className="border-b border-border">
              <button onClick={() => toggleAccordion("forms")} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Forms</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">No outstanding form requests</p>
                </div>
                <ChevronDown size={15} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${accordion["forms"] ? "rotate-180" : ""}`} />
              </button>
              {accordion["forms"] && <div className="px-4 py-3 border-t border-border bg-gray-50/50 text-sm text-gray-500">No forms have been requested.</div>}
            </div>

            {/* Upcoming appointment */}
            <div className="border-b border-border">
              <button onClick={() => toggleAccordion("appointment")} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Upcoming appointment</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">No upcoming appointments</p>
                </div>
                <ChevronDown size={15} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${accordion["appointment"] ? "rotate-180" : ""}`} />
              </button>
              {accordion["appointment"] && <div className="px-4 py-3 border-t border-border bg-gray-50/50 text-sm text-gray-500">No upcoming appointments scheduled.</div>}
            </div>

            {/* Payments */}
            <div>
              <button onClick={() => toggleAccordion("payments")} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Payments</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-semibold text-gray-900">$130.40 not requested (family)</p>
                    <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-500 border border-orange-200 rounded font-medium">Not requested</span>
                  </div>
                </div>
                <ChevronDown size={15} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${accordion["payments"] ? "rotate-180" : ""}`} />
              </button>
              {accordion["payments"] && <div className="px-4 py-3 border-t border-border bg-gray-50/50 text-sm text-gray-500">$130.40 outstanding balance for the family.</div>}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {(["history", "messages", "appointments"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
                Filter by <ChevronDown size={13} />
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "history" && (
              <div className="space-y-1 pb-4">
                {PATIENT_HISTORY.map(item => (
                  <div key={item.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-teal-50 border-2 border-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CircleDollarSign size={15} className="text-teal-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">Submitted a payment of <span className="font-semibold">{item.amount}</span></p>
                      <p className="text-xs text-gray-400">{item.date} · {item.time}</p>
                      <button className="mt-2 px-3 py-1 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700">
                        See details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "messages" && (
              <div className="py-8 text-center text-gray-400 text-sm">No messages yet</div>
            )}
            {activeTab === "appointments" && (
              <div className="py-8 text-center text-gray-400 text-sm">No upcoming appointments</div>
            )}
          </div>
        </div>
      </div>

      {/* Nested modals */}
      {modal === "editInfo" && (
        <EditPatientInfoModal
          patient={patient}
          onClose={() => setModal(null)}
          onSave={(updated) => { onSavePatient(updated); setModal(null); }}
        />
      )}
      {modal === "notificationPrefs" && (
        <EditNotificationPreferencesModal onClose={() => setModal(null)} />
      )}
    </>
  );
}
