import { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import type { NotificationPrefs, Patient } from "../../types";

const NOTIFICATION_TYPES = [
  "Cancelled", "Continuing Care Recalls", "Form reminders", "Form requests",
  "Missed", "NexHealth Appointment Confirmed", "NexHealth Appointment Request",
  "NexHealth Appointment Rescheduled", "Recalls", "Reminders", "Reviews",
  "Save the Date", "Waitlist",
];

function defaultChecks(): Record<string, { email: boolean; sms: boolean }> {
  return Object.fromEntries(NOTIFICATION_TYPES.map(t => [t, { email: true, sms: true }]));
}

export function EditNotificationPreferencesModal({ patient, onClose, onSave }: {
  patient: Patient;
  onClose: () => void;
  onSave: (prefs: NotificationPrefs) => void;
}) {
  const [checks, setChecks] = useState<Record<string, { email: boolean; sms: boolean }>>(() => {
    const saved = patient.notificationPrefs?.types;
    return saved ? { ...defaultChecks(), ...saved } : defaultChecks();
  });
  const [apptExpanded, setApptExpanded] = useState(true);
  const [patientExpanded, setPatientExpanded] = useState(false);

  const emailOn = NOTIFICATION_TYPES.every(t => checks[t].email);
  const smsOn = NOTIFICATION_TYPES.every(t => checks[t].sms);

  function toggleCheck(type: string, channel: "email" | "sms") {
    setChecks(prev => ({ ...prev, [type]: { ...prev[type], [channel]: !prev[type][channel] } }));
  }

  function setChannelAll(channel: "email" | "sms", value: boolean) {
    setChecks(prev => Object.fromEntries(
      NOTIFICATION_TYPES.map(t => [t, { ...prev[t], [channel]: value }])
    ));
  }

  function handleSave() {
    onSave({ email: emailOn, sms: smsOn, types: checks });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit notification preferences</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-5">
          {/* Notification methods */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-1">Notification methods</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-1">Turning on a notification type will resubscribe this patient to that method of notification.</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">Changes to SMS preferences will automatically apply to all patients sharing this phone number.</p>
            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle on={emailOn} onChange={(v) => setChannelAll("email", v)} />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle on={smsOn} onChange={(v) => setChannelAll("sms", v)} />
                <span className="text-sm font-medium text-gray-700">SMS</span>
              </label>
            </div>
          </div>

          {/* Notification types */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Notification type</p>

            {/* Appointments accordion */}
            <div className={`border rounded-lg overflow-hidden mb-2 ${apptExpanded ? "border-teal-400" : "border-gray-200"}`}>
              <button
                onClick={() => setApptExpanded(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${apptExpanded ? "bg-teal-50" : "bg-white hover:bg-gray-50"}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {apptExpanded ? <ChevronDown size={14} className="text-teal-500" /> : <ChevronRight size={14} className="text-gray-400" />}
                  Appointments
                </span>
                <div className="flex items-center gap-6 text-xs font-semibold text-gray-500 pr-1">
                  <span>Email</span>
                  <span>SMS</span>
                </div>
              </button>
              {apptExpanded && (
                <div className="border-t border-teal-100">
                  {NOTIFICATION_TYPES.map(type => (
                    <div key={type} className="flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <span className="text-sm text-gray-700">{type}</span>
                      <div className="flex items-center gap-8 pr-1">
                        <input type="checkbox" checked={checks[type].email} onChange={() => toggleCheck(type, "email")} className="w-4 h-4 rounded accent-teal-500 cursor-pointer" />
                        <input type="checkbox" checked={checks[type].sms}   onChange={() => toggleCheck(type, "sms")}   className="w-4 h-4 rounded accent-teal-500 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Patient accordion */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setPatientExpanded(v => !v)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {patientExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="text-gray-400" />}
                  Patient
                </span>
                <div className="flex items-center gap-6 pr-1">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-teal-500" readOnly />
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-teal-500" readOnly />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleSave} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
