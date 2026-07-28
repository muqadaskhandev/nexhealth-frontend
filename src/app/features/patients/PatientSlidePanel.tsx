import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, CircleDollarSign, Calendar, MessageSquare, FileText, ShieldCheck, StickyNote } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { SyncTooltip } from "../../components/shared/SyncTooltip";
import { IconButton } from "../../components/shared/IconButton";
import { InsuranceAccordion } from "../insurance/InsuranceAccordion";
import { EditPatientInfoModal } from "./EditPatientInfoModal";
import { EditNotificationPreferencesModal, hasUnsubscribedPrefs } from "./EditNotificationPreferencesModal";
import { staffApi, type ApiAppointment } from "../../lib/staff-api";
import type { Patient, ActivityItem, ActivityType, MessageItem } from "../../types";

const ACTIVITY_ICON: Record<ActivityType, typeof CircleDollarSign> = {
  appointment: Calendar,
  message: MessageSquare,
  form: FileText,
  payment: CircleDollarSign,
  verification: ShieldCheck,
  note: StickyNote,
};

const APPT_STATUS_CLASS: Record<string, string> = {
  "checked-in": "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  unconfirmed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function PatientSlidePanel({ patient, onClose, onSavePatient }: {
  patient: Patient; onClose: () => void;
  onSavePatient: (p: Patient) => void | Promise<void>;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "messages" | "appointments">("history");
  const [accordion, setAccordion] = useState<Record<string, boolean>>({
    insurance: false, forms: false, appointment: false, payments: false,
  });
  const [modal, setModal] = useState<"editInfo" | "notificationPrefs" | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);

  useEffect(() => {
    let cancelled = false;
    staffApi.patients.activity(patient.id).then((rows) => {
      if (cancelled) return;
      setActivity(rows.map((a) => ({ id: a.id, type: a.activity_type as ActivityType, title: a.title, body: a.body, createdAt: a.created_at })));
    });
    staffApi.messages.list(patient.id).then((rows) => {
      if (cancelled) return;
      setMessages(rows.map((m) => ({ id: m.id, body: m.body, direction: m.direction, channel: m.channel, sentAt: m.sent_at })));
    });
    staffApi.appointments.list({ patientId: patient.id }).then((rows) => {
      if (cancelled) return;
      setAppointments(rows);
    });
    return () => { cancelled = true; };
  }, [patient.id]);

  const now = Date.now();
  const upcomingAppointment = appointments
    .filter((a) => new Date(a.starts_at).getTime() > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

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
      <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-[1px] z-30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[560px] bg-[#f8fafb] shadow-2xl z-40 flex flex-col overflow-hidden border-l border-gray-200">

        {/* ── Patient header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-teal-100/80 flex-shrink-0 bg-gradient-to-br from-teal-50 via-white to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <PatientAvatar initials={patient.initials} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">
                    {patient.firstName} {patient.lastName}
                  </h2>
                  {patient.archived && (
                    <span className="px-2 py-0.5 text-xs font-medium border border-pink-300 text-pink-600 bg-pink-50 rounded-md flex-shrink-0">
                      Archived
                    </span>
                  )}
                  {hasUnsubscribedPrefs(patient.notificationPrefs) && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium border border-amber-300 text-amber-800 bg-amber-50 rounded-md flex-shrink-0"
                      title="This patient is unsubscribed from one or more email/SMS automations"
                    >
                      Partial unsubscribe
                    </span>
                  )}
                  {!patient.synced && <SyncTooltip />}
                </div>
                {patient.preferredName && patient.preferredName !== `${patient.firstName} ${patient.lastName}` && (
                  <p className="text-xs text-teal-700 font-medium mt-0.5">Preferred: {patient.preferredName}</p>
                )}
                <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                  <p>
                    {patient.dob}
                    {patient.gender ? ` · ${patient.gender}` : ""}
                    {patient.language ? ` · ${patient.language}` : ""}
                  </p>
                  <p className="truncate">{patient.email || "No email"}</p>
                  <p>{patient.phone || "No phone"}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div ref={actionsRef} className="relative">
                <button
                  onClick={() => setActionsOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-xl transition-colors ${actionsOpen ? "border-teal-400 bg-teal-50 text-teal-700" : "border-gray-200 bg-white hover:border-teal-300 text-gray-700"}`}
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
              <IconButton label="Close" onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-xl text-gray-500 hover:bg-white bg-white transition-colors">
                <X size={15} />
              </IconButton>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Accordion sections */}
          <div className="mx-4 mt-4 mb-4 bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
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
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {upcomingAppointment
                      ? `${formatDateTime(upcomingAppointment.starts_at)} · ${upcomingAppointment.provider_name}`
                      : "No upcoming appointments"}
                  </p>
                </div>
                <ChevronDown size={15} className={`text-gray-400 transition-transform flex-shrink-0 ml-2 ${accordion["appointment"] ? "rotate-180" : ""}`} />
              </button>
              {accordion["appointment"] && (
                <div className="px-4 py-3 border-t border-border bg-gray-50/50 text-sm text-gray-500">
                  {upcomingAppointment
                    ? `${upcomingAppointment.appointment_type} with ${upcomingAppointment.provider_name}, ${upcomingAppointment.duration_minutes} minutes.`
                    : "No upcoming appointments scheduled."}
                </div>
              )}
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
          <div className="px-4 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-0.5 bg-white border border-border rounded-xl p-0.5 shadow-sm">
                {(["history", "messages", "appointments"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === tab ? "bg-teal-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "history" && (
              activity.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">No activity yet</div>
              ) : (
                <div className="space-y-0 pb-2 bg-white rounded-2xl border border-border overflow-hidden shadow-sm divide-y divide-border">
                  {activity.map(item => {
                    const Icon = ACTIVITY_ICON[item.type] ?? StickyNote;
                    return (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={15} className="text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{item.title}</p>
                          {item.body && <p className="text-sm text-gray-500 mt-0.5">{item.body}</p>}
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
            {activeTab === "messages" && (
              messages.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">No messages yet</div>
              ) : (
                <div className="space-y-3 pb-2">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.direction === "outbound" ? "bg-teal-50 border border-teal-200" : "bg-white border border-border"}`}>
                        <p className="text-sm text-gray-800">{m.body}</p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                          <span className="uppercase">{m.channel}</span>·{formatDateTime(m.sentAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {activeTab === "appointments" && (
              appointments.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">No upcoming appointments</div>
              ) : (
                <div className="space-y-0 bg-white rounded-2xl border border-border overflow-hidden shadow-sm divide-y divide-border">
                  {appointments.map(a => (
                    <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 font-medium">{a.appointment_type} with {a.provider_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.starts_at)} · {a.duration_minutes} minutes</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${APPT_STATUS_CLASS[a.status] ?? APPT_STATUS_CLASS.unconfirmed}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
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
        <EditNotificationPreferencesModal
          patient={patient}
          onClose={() => setModal(null)}
          onSave={async (prefs) => {
            await onSavePatient({ ...patient, notificationPrefs: prefs });
          }}
        />
      )}
    </>
  );
}
