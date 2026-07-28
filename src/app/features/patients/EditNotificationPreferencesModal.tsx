import { useMemo, useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import type { NotificationPrefs, Patient } from "../../types";

/** Appointment / automation categories staff can unsubscribe a patient from. */
export const APPOINTMENT_NOTIFICATION_TYPES = [
  "Cancelled",
  "Form reminders",
  "Form requests",
  "Missed",
  "NexHealth Appointment Confirmed",
  "NexHealth Appointment Request",
  "NexHealth Appointment Rescheduled",
  "Post Appointment Follow-up",
  "Payments",
  "Recalls",
  "Reminders",
  "Reviews",
  "Save the Date",
  "Waitlist Appointment",
  "Waitlist Continuing Care",
] as const;

/** Patient-based automations (New Patient, Birthday). */
export const PATIENT_NOTIFICATION_TYPES = ["New Patient", "Birthday"] as const;

export const ALL_NOTIFICATION_TYPES = [
  ...APPOINTMENT_NOTIFICATION_TYPES,
  ...PATIENT_NOTIFICATION_TYPES,
] as const;

export type NotificationTypeName = (typeof ALL_NOTIFICATION_TYPES)[number];

function defaultChecks(): Record<string, { email: boolean; sms: boolean }> {
  return Object.fromEntries(
    ALL_NOTIFICATION_TYPES.map((t) => [t, { email: true, sms: true }])
  );
}

function mergeChecks(
  saved?: Record<string, { email: boolean; sms: boolean }>
): Record<string, { email: boolean; sms: boolean }> {
  const base = defaultChecks();
  if (!saved) return base;
  // Migrate legacy "Waitlist" / "Continuing Care Recalls" keys if present
  const legacy: Record<string, string> = {
    Waitlist: "Waitlist Appointment",
    "Continuing Care Recalls": "Recalls",
  };
  for (const [key, value] of Object.entries(saved)) {
    const mapped = legacy[key] ?? key;
    if (base[mapped]) {
      base[mapped] = { email: !!value.email, sms: !!value.sms };
    }
  }
  return base;
}

/** True when at least one automation channel is turned off. */
export function hasUnsubscribedPrefs(prefs?: NotificationPrefs): boolean {
  if (!prefs?.types) {
    if (prefs && (prefs.email === false || prefs.sms === false)) return true;
    return false;
  }
  return Object.values(prefs.types).some((t) => !t.email || !t.sms);
}

export function EditNotificationPreferencesModal({
  patient,
  onClose,
  onSave,
}: {
  patient: Patient;
  onClose: () => void;
  onSave: (prefs: NotificationPrefs) => void | Promise<void>;
}) {
  const [checks, setChecks] = useState(() =>
    mergeChecks(patient.notificationPrefs?.types)
  );
  const [apptExpanded, setApptExpanded] = useState(true);
  const [patientExpanded, setPatientExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  const emailOn = useMemo(
    () => ALL_NOTIFICATION_TYPES.every((t) => checks[t].email),
    [checks]
  );
  const smsOn = useMemo(
    () => ALL_NOTIFICATION_TYPES.every((t) => checks[t].sms),
    [checks]
  );

  function toggleCheck(type: string, channel: "email" | "sms") {
    setChecks((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  }

  function setChannelAll(channel: "email" | "sms", value: boolean) {
    setChecks((prev) =>
      Object.fromEntries(
        ALL_NOTIFICATION_TYPES.map((t) => [t, { ...prev[t], [channel]: value }])
      )
    );
  }

  function setSectionChannel(
    types: readonly string[],
    channel: "email" | "sms",
    value: boolean
  ) {
    setChecks((prev) => {
      const next = { ...prev };
      for (const t of types) {
        next[t] = { ...next[t], [channel]: value };
      }
      return next;
    });
  }

  function sectionAllOn(types: readonly string[], channel: "email" | "sms") {
    return types.every((t) => checks[t][channel]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        email: emailOn,
        sms: smsOn,
        types: checks,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit notification preferences</h2>
            <p className="text-xs text-gray-500 mt-1">
              Unsubscribe or resubscribe this patient from email and SMS automations.
            </p>
          </div>
          <IconButton
            label="Close"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto px-6 pb-2 flex-1 space-y-5">
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-3.5 py-2.5 text-xs text-teal-900 leading-relaxed">
            Patients can also unsubscribe from email themselves or reply <strong>STOP</strong> to
            SMS. Use this screen when they ask you to stop (or resume) a specific communication.
          </div>

          <div>
            <p className="text-sm font-bold text-gray-900 mb-1">Notification methods</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-1">
              Turning on a notification type will resubscribe this patient to that method of
              notification.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Changes to SMS preferences will automatically apply to all patients sharing this phone
              number.
            </p>
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

          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Notification type</p>
            <p className="text-xs text-gray-500 mb-3">
              If a patient isn&apos;t receiving messages, confirm the boxes below are checked for
              the relevant automations (e.g. Reminders) and that their contact info is correct. If
              they still get messages after unsubscribing, check whether they remain subscribed to a
              separate category (e.g. Save the Date).
            </p>

            <NotificationSection
              title="Appointments"
              types={APPOINTMENT_NOTIFICATION_TYPES}
              checks={checks}
              expanded={apptExpanded}
              onToggleExpanded={() => setApptExpanded((v) => !v)}
              onToggleCheck={toggleCheck}
              emailAllOn={sectionAllOn(APPOINTMENT_NOTIFICATION_TYPES, "email")}
              smsAllOn={sectionAllOn(APPOINTMENT_NOTIFICATION_TYPES, "sms")}
              onToggleSection={(channel, value) =>
                setSectionChannel(APPOINTMENT_NOTIFICATION_TYPES, channel, value)
              }
            />

            <NotificationSection
              title="Patient"
              types={PATIENT_NOTIFICATION_TYPES}
              checks={checks}
              expanded={patientExpanded}
              onToggleExpanded={() => setPatientExpanded((v) => !v)}
              onToggleCheck={toggleCheck}
              emailAllOn={sectionAllOn(PATIENT_NOTIFICATION_TYPES, "email")}
              smsAllOn={sectionAllOn(PATIENT_NOTIFICATION_TYPES, "sms")}
              onToggleSection={(channel, value) =>
                setSectionChannel(PATIENT_NOTIFICATION_TYPES, channel, value)
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
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

function NotificationSection({
  title,
  types,
  checks,
  expanded,
  onToggleExpanded,
  onToggleCheck,
  emailAllOn,
  smsAllOn,
  onToggleSection,
}: {
  title: string;
  types: readonly string[];
  checks: Record<string, { email: boolean; sms: boolean }>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleCheck: (type: string, channel: "email" | "sms") => void;
  emailAllOn: boolean;
  smsAllOn: boolean;
  onToggleSection: (channel: "email" | "sms", value: boolean) => void;
}) {
  return (
    <div
      className={`border rounded-lg overflow-hidden mb-2 ${
        expanded ? "border-teal-400" : "border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${
          expanded ? "bg-teal-50" : "bg-white hover:bg-gray-50"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {expanded ? (
            <ChevronDown size={14} className="text-teal-500" />
          ) : (
            <ChevronRight size={14} className="text-gray-400" />
          )}
          {title}
        </span>
        <div className="flex items-center gap-6 text-xs font-semibold text-gray-500 pr-1">
          <span
            className="inline-flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={emailAllOn}
              onChange={(e) => onToggleSection("email", e.target.checked)}
              className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
              aria-label={`${title} email all`}
            />
            Email
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={smsAllOn}
              onChange={(e) => onToggleSection("sms", e.target.checked)}
              className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
              aria-label={`${title} SMS all`}
            />
            SMS
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-teal-100">
          {types.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
            >
              <span className="text-sm text-gray-700">{type}</span>
              <div className="flex items-center gap-8 pr-1">
                <input
                  type="checkbox"
                  checked={checks[type].email}
                  onChange={() => onToggleCheck(type, "email")}
                  className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
                  aria-label={`${type} email`}
                />
                <input
                  type="checkbox"
                  checked={checks[type].sms}
                  onChange={() => onToggleCheck(type, "sms")}
                  className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
                  aria-label={`${type} SMS`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
