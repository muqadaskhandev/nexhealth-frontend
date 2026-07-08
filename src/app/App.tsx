import { useState, useRef, useEffect } from "react";
import {
  Menu, Home, Activity, Users, FileText, MessageSquare, Calendar, CreditCard,
  ChevronDown, ChevronRight, Settings, User, MapPin, Search, ChevronLeft,
  Filter, MoreHorizontal, Info, CheckCircle2, AlertCircle, ArrowRight, X,
  Check, DollarSign, Clock, XCircle, CloudOff, ArrowLeft, AlertTriangle,
  Lock, CircleDollarSign, ClipboardList, ShieldCheck, Upload, RefreshCw,
  Wrench, Archive, Copy, Download, Eye, EyeOff, Edit, MapPinned, RotateCcw,
  Smartphone, WifiOff, Wifi, LogOut,
} from "lucide-react";
import { useAuth } from "./auth/AuthContext";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { SettingsSection } from "./settings/SettingsSection";
import { authApi, ssoLoginUrl, type ApiLocation } from "./lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type NavItem = {
  id: string; label: string; icon: React.ReactNode;
  badge?: number; children?: { id: string; label: string }[];
};

type AppointmentStatus = "checked-in" | "confirmed" | "unconfirmed" | "cancelled";

type Appointment = {
  id: string; patientId: string; time: string; duration: string;
  status: AppointmentStatus;
  patient: { name: string; dob: string; initials: string; color: string };
  contact: { phone: string; email: string; redacted?: boolean };
  details: { provider: string; type: string };
  insurance: "pending" | "verified"; forms: "complete" | "incomplete";
};

type Location = { id: string; name: string; address: string };
type PatientResult = { id: string; name: string; dob: string; phone: string; email: string; initials: string };

type EligibilityStatus = "active" | "unverified" | "self-pay" | "inactive" | "unknown";

type InsuranceData = {
  status: EligibilityStatus;
  name: string;
  overridden?: boolean;
  memberId?: string;
  planDates?: string;
  payerId?: string;
  verifiedOn?: string;
  pdfSyncedOn?: string;
  dataSource?: string;
  providerName?: string;
  npi?: string;
};

type Patient = {
  id: string; firstName: string; lastName: string; dob: string; gender: string;
  email: string; phone: string; provider: string; language: string;
  initials: string; synced: boolean; archived: boolean;
  preferredName?: string; address?: string;
  insuranceData?: InsuranceData;
};

type HistoryItem = { id: string; amount: string; date: string; time: string };

// ── Transition rules ──────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  unconfirmed: ["confirmed", "checked-in", "cancelled"],
  confirmed:   ["checked-in", "cancelled"],
  "checked-in": ["cancelled"],
  cancelled:   [],
};

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "home",      label: "Home",      icon: <Home size={16} /> },
  { id: "activity",  label: "Activity",  icon: <Activity size={16} /> },
  { id: "patients",  label: "Patients",  icon: <Users size={16} /> },
  { id: "templates", label: "Templates", icon: <FileText size={16} /> },
  { id: "communications", label: "Communications", icon: <MessageSquare size={16} />,
    children: [
      { id: "messages",  label: "Messages"  },
      { id: "campaigns", label: "Campaigns" },
      { id: "reminders", label: "Reminders" },
      { id: "recalls",   label: "Recalls"   },
      { id: "reviews",   label: "Reviews"   },
    ],
  },
  { id: "scheduling", label: "Scheduling", icon: <Calendar size={16} />,
    children: [
      { id: "waitlist",       label: "Waitlist"       },
      { id: "online-booking", label: "Online booking" },
    ],
  },
  { id: "forms",        label: "Forms",        icon: <ClipboardList size={16} /> },
  { id: "payments",     label: "Payments",     icon: <CreditCard size={16} />    },
  { id: "verification", label: "Verification", icon: <ShieldCheck size={16} />   },
];

const STAT_CARDS = [
  { id: "confirmed",    value: 2,  label: "Appointments confirmed",      period: "Last 90 days", description: "Prevent no shows with regular reminders.",          color: "#d946ef", bg: "#fdf4ff", icon: <CheckCircle2 size={20} /> },
  { id: "new-patients", value: 31, label: "New patients",                period: "Last 90 days", description: "We love seeing your practice grow!",                color: "#38bdf8", bg: "#f0f9ff", icon: <Users size={20} /> },
  { id: "booked-online",value: 87, label: "Appointments booked online",  period: "Last 90 days", description: "That's 87 phone calls you didn't have to make.",    color: "#fb923c", bg: "#fff7ed", icon: <Calendar size={20} /> },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: "1", patientId: "p3",  time: "8:30 AM",  duration: "90 minutes", status: "checked-in",
    patient: { name: "Homer Simpson",          dob: "Dec 17th, 1962", initials: "HS", color: "#6366f1" },
    contact: { phone: "(555)555-5555", email: "homer.simpson@email.com" },
    details: { provider: "Nick Riviera", type: "OP1" }, insurance: "pending", forms: "complete" },
  { id: "2", patientId: "p4",  time: "9:00 AM",  duration: "15 minutes", status: "checked-in",
    patient: { name: "Marge Simpson",          dob: "Oct 1st, 1956",  initials: "MS", color: "#0ea5e9" },
    contact: { phone: "••••••••••", email: "••••••••••••••••••••••", redacted: true },
    details: { provider: "Nick Riviera", type: "OP1" }, insurance: "pending", forms: "complete" },
  { id: "3", patientId: "p5",  time: "10:00 AM", duration: "60 minutes", status: "checked-in",
    patient: { name: "Bart Simpson",           dob: "Apr 1st, 1980",  initials: "BS", color: "#f59e0b" },
    contact: { phone: "(555)555-5556", email: "bart.simpson@email.com" },
    details: { provider: "Nick Riviera", type: "OP1" }, insurance: "verified", forms: "complete" },
  { id: "4", patientId: "p6",  time: "11:00 AM", duration: "30 minutes", status: "confirmed",
    patient: { name: "Lisa Simpson",           dob: "May 9th, 1984",  initials: "LS", color: "#ec4899" },
    contact: { phone: "(555)555-5557", email: "lisa.simpson@email.com" },
    details: { provider: "Nick Riviera", type: "OP1" }, insurance: "verified", forms: "complete" },
  { id: "5", patientId: "p7",  time: "1:00 PM",  duration: "45 minutes", status: "unconfirmed",
    patient: { name: "Ned Flanders",           dob: "Nov 9th, 1952",  initials: "NF", color: "#10b981" },
    contact: { phone: "(555)555-5558", email: "ned.flanders@email.com" },
    details: { provider: "Nick Riviera", type: "OP2" }, insurance: "pending", forms: "incomplete" },
  { id: "6", patientId: "p10", time: "2:00 PM",  duration: "30 minutes", status: "unconfirmed",
    patient: { name: "Apu Nahasapeemapetilon", dob: "Jan 1st, 1965",  initials: "AN", color: "#8b5cf6" },
    contact: { phone: "(555)555-5559", email: "apu@email.com" },
    details: { provider: "Nick Riviera", type: "OP2" }, insurance: "verified", forms: "incomplete" },
];

const INITIAL_PATIENTS: Patient[] = [
  { id: "p1",  firstName: "Benjamin", lastName: "Sisko",              dob: "Jan 7th, 1977",  gender: "Male",   email: "benjamin.sisko@star.fleetacademy", phone: "(***) ***-****", provider: "Nick Riviera", language: "English", initials: "BS", synced: true,  archived: false,
    insuranceData: { status: "active", name: "Cigna", memberId: "U12345678901", planDates: "01/01/2025 - 12/31/2025", payerId: "12345", verifiedOn: "03/25/2025", pdfSyncedOn: "03/25/2025", dataSource: "On Demand Verification", providerName: "Nick Riviera", npi: "1234567890" } },
  { id: "p2",  firstName: "Beverly",  lastName: "Crusher",            dob: "Oct 13th, 1975", gender: "Female", email: "beverly.crusher@star.fleetacademy",phone: "(***) ***-****", provider: "Nick Riviera", language: "English", initials: "BC", synced: false, archived: false,
    insuranceData: { status: "unverified", name: "Unknown" } },
  { id: "p3",  firstName: "Homer",    lastName: "Simpson",            dob: "Dec 17th, 1962", gender: "Male",   email: "homer.simpson@email.com",           phone: "(555) 555-5555", provider: "Nick Riviera", language: "English", initials: "HS", synced: true,  archived: false, preferredName: "Homer Simpson", address: "742 Evergreen Terrace",
    insuranceData: { status: "unverified", name: "Unknown" } },
  { id: "p4",  firstName: "Marge",    lastName: "Simpson",            dob: "Oct 1st, 1956",  gender: "Female", email: "marge.simpson@email.com",           phone: "(555) 555-5556", provider: "Nick Riviera", language: "English", initials: "MS", synced: true,  archived: false, insuranceData: { status: "unknown", name: "Unknown" } },
  { id: "p5",  firstName: "Bart",     lastName: "Simpson",            dob: "Apr 1st, 1980",  gender: "Male",   email: "bart.simpson@email.com",            phone: "(555) 555-5557", provider: "Nick Riviera", language: "English", initials: "BS", synced: false, archived: false, insuranceData: { status: "unknown", name: "Unknown" } },
  { id: "p6",  firstName: "Lisa",     lastName: "Simpson",            dob: "May 9th, 1984",  gender: "Female", email: "lisa.simpson@email.com",            phone: "(555) 555-5558", provider: "Nick Riviera", language: "English", initials: "LS", synced: true,  archived: false, insuranceData: { status: "self-pay", name: "Self Pay", overridden: true } },
  { id: "p7",  firstName: "Ned",      lastName: "Flanders",           dob: "Nov 9th, 1952",  gender: "Male",   email: "ned.flanders@email.com",            phone: "(555) 555-5559", provider: "Nick Riviera", language: "English", initials: "NF", synced: false, archived: false, insuranceData: { status: "unknown", name: "Unknown" } },
  { id: "p8",  firstName: "Jane",     lastName: "Doe",                dob: "Feb 7th, 1998",  gender: "Female", email: "jane.doe@email.com",                phone: "(555) 555-5560", provider: "Nick Riviera", language: "English", initials: "JD", synced: false, archived: true,  insuranceData: { status: "unknown", name: "Unknown" } },
  { id: "p9",  firstName: "Jean-Luc", lastName: "Picard",             dob: "Jul 13th, 1948", gender: "Male",   email: "picard@starfleet.gov",              phone: "(***) ***-****", provider: "Nick Riviera", language: "French",  initials: "JP", synced: true,  archived: false, insuranceData: { status: "inactive", name: "Inactive", overridden: true } },
  { id: "p10", firstName: "Deanna",   lastName: "Troi",               dob: "Mar 29th, 1959", gender: "Female", email: "d.troi@starfleet.gov",              phone: "(***) ***-****", provider: "Nick Riviera", language: "English", initials: "DT", synced: false, archived: false, insuranceData: { status: "unknown", name: "Unknown" } },
];

const LOCATIONS: Location[] = [
  { id: "sf",        name: "Better Dental - San Francisco", address: "445 Bush St., Sausalito, 94114" },
  { id: "manhattan", name: "Better Dental - Manhattan",     address: "45 Rockefeller Place, New York City, NY, 10111" },
  { id: "brooklyn",  name: "Better Dental - Brooklyn",      address: "980 Washington Ave, Brooklyn, 11225" },
  { id: "sausalito", name: "Better Dental - Sausalito",     address: "420 Litho St., Sausalito, 94965" },
  { id: "oakland",   name: "Better Dental - Oakland",       address: "1 Frank H. Ogawa Plaza, Oakland, 94612" },
];

const PATIENT_RESULTS: PatientResult[] = [
  { id: "hs", name: "Homer Simpson", dob: "December 17, 1962", phone: "(555) 555-5555", email: "homer.simpson@email.com", initials: "HS" },
  { id: "ms", name: "Marge Simpson", dob: "October 1, 1956",   phone: "(555) 555-5556", email: "marge.simpson@email.com", initials: "MS" },
  { id: "bs", name: "Bart Simpson",  dob: "April 1, 1980",     phone: "(555) 555-5557", email: "bart.simpson@email.com",  initials: "BS" },
  { id: "ls", name: "Lisa Simpson",  dob: "May 9, 1984",       phone: "(555) 555-5558", email: "lisa.simpson@email.com",  initials: "LS" },
  { id: "nf", name: "Ned Flanders",  dob: "November 9, 1952",  phone: "(555) 555-5559", email: "ned.flanders@email.com",  initials: "NF" },
];

const PATIENT_HISTORY: HistoryItem[] = [
  { id: "h1", amount: "$100.00", date: "Dec 3, 2024",  time: "12:06 PM" },
  { id: "h2", amount: "$40.00",  date: "Dec 2, 2024",  time: "8:21 PM"  },
  { id: "h3", amount: "$75.00",  date: "Nov 15, 2024", time: "3:45 PM"  },
];

const NOTIFICATION_TYPES = [
  "Cancelled", "Continuing Care Recalls", "Form reminders", "Form requests",
  "Missed", "NexHealth Appointment Confirmed", "NexHealth Appointment Request",
  "NexHealth Appointment Rescheduled", "Recalls", "Reminders", "Reviews",
  "Save the Date", "Waitlist",
];

const MANAGE_FORMS = [
  "Attach Other Documents", "Cancellation Policy",
  "Consent for Internet Communications", "Credit Card Authorization Form",
  "Dental History Form", "Dental Insurance Verification Form",
  "Driver License Form", "HIPAA Notice",
  "Medical History Form", "Patient Information Form",
];

type FormSyncStatus = "syncing" | "sync-now" | "assign-sync" | "sync-failed" | "date" | "complete";

type FormSubmission = {
  id: string;
  patient: string;
  initials: string;
  submitted: string;
  device: string;
  expiration: string;
  formName: string;
  completedStatus: "Complete";
  syncStatus: FormSyncStatus;
  syncLabel?: string;
};

const FORM_SUBMISSIONS: FormSubmission[] = [
  { id: "f1", patient: "Tony Stark",        initials: "TS", submitted: "Nov 15, 2024 • 5:01 AM",  device: "Submitted via iPad", expiration: "",            formName: "Patient_Information.pdf",           completedStatus: "Complete", syncStatus: "syncing" },
  { id: "f2", patient: "Steve Rogers",      initials: "SR", submitted: "Nov 15, 2024 • 3:50 AM",  device: "Submitted via iPad", expiration: "",            formName: "Patient_Information.pdf",           completedStatus: "Complete", syncStatus: "sync-now" },
  { id: "f3", patient: "Bruce Banner",      initials: "BB", submitted: "Nov 14, 2024 • 4:07 AM",  device: "Submitted via iPad", expiration: "",            formName: "bonding_and_veneers_info_form.pdf", completedStatus: "Complete", syncStatus: "assign-sync" },
  { id: "f4", patient: "Natasha Romanoff",  initials: "NR", submitted: "Nov 15, 2023 • 9:48 AM",  device: "Submitted via iPad", expiration: "",            formName: "Patient_Information.pdf",           completedStatus: "Complete", syncStatus: "sync-failed" },
  { id: "f5", patient: "T'Challa Panther",  initials: "TP", submitted: "Oct 25, 2023 • 5:05 PM",  device: "Submitted via iPad", expiration: "",            formName: "Patient_Information.pdf",           completedStatus: "Complete", syncStatus: "date", syncLabel: "Aug 20" },
  { id: "f6", patient: "Peter Parker",      initials: "PP", submitted: "Oct 24, 2023 • 2:52 AM",  device: "Submitted via iPad", expiration: "",            formName: "Patient_Information.pdf",           completedStatus: "Complete", syncStatus: "assign-sync" },
];

const FORM_TEMPLATES = [
  "Patient Intake Form", "Medical History", "HIPAA Consent",
  "Insurance Authorization", "Dental History", "COVID Screening",
];

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_META: Record<AppointmentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  "checked-in": { label: "Checked in",  className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300", icon: <CheckCircle2 size={11} /> },
  confirmed:    { label: "Confirmed",   className: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300",             icon: null },
  unconfirmed:  { label: "Unconfirmed", className: "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300",            icon: null },
  cancelled:    { label: "Cancelled",   className: "bg-red-50 text-red-600 border-red-200",                                      icon: <XCircle size={11} /> },
};

// ── Shared primitives ──────────────────────────────────────────────────────────

function PatientAvatar({ initials, color, size = "md" }: { initials: string; color?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "xl" ? "w-14 h-14 text-base" : size === "lg" ? "w-12 h-12 text-sm" : size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0`} style={{ backgroundColor: color ?? "#6b7280" }}>
      {initials}
    </div>
  );
}

function SyncTooltip() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors" aria-label="Sync status">
        <CloudOff size={15} />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-50 leading-relaxed pointer-events-none">
          This patient was created in NexHealth and is not synced to your health record system
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

function StatusDropdown({ appointmentId, status, onStatusChange }: {
  appointmentId: string; status: AppointmentStatus;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[status];
  const transitions = ALLOWED_TRANSITIONS[status];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!transitions.length) {
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.className}`}>{meta.label}{meta.icon}</span>;
  }
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${meta.className}`}>
        {meta.label}{meta.icon}<ChevronDown size={10} className="ml-0.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Change status to</p>
          {transitions.map(next => {
            const m = STATUS_META[next];
            return (
              <button key={next} onClick={() => { onStatusChange(appointmentId, next); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.className}`}>{m.label}{m.icon}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${on ? "bg-teal-500" : "bg-gray-300"}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

// ── VerifyOnDemandModal ────────────────────────────────────────────────────────

const INSURERS = [
  "Aetna", "Anthem", "Blue Cross Blue Shield", "Cigna", "Humana",
  "Kaiser Permanente", "MetLife", "United Healthcare", "Delta Dental", "Guardian",
];

function VerifyOnDemandModal({ patient, onClose, onVerified }: {
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
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></button>
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

// ── OverrideEligibilityStatusModal ────────────────────────────────────────────

const ELIGIBILITY_OPTIONS: { value: EligibilityStatus; label: string }[] = [
  { value: "active",    label: "Active"    },
  { value: "self-pay",  label: "Self pay"  },
  { value: "inactive",  label: "Inactive"  },
  { value: "unknown",   label: "Unknown"   },
];

function OverrideEligibilityStatusModal({ current, onClose, onSave }: {
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

// ── InsuranceAccordion ─────────────────────────────────────────────────────────

function InsuranceAccordion({ patient, onSavePatient }: {
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
                <button
                  onClick={() => setEllipsisOpen(v => !v)}
                  className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal size={16} />
                </button>
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

// ── EditPatientInfoModal ───────────────────────────────────────────────────────

function EditPatientInfoModal({ patient, onClose, onSave }: {
  patient: Patient; onClose: () => void;
  onSave: (updated: Patient) => void;
}) {
  const [form, setForm] = useState({
    preferredName: patient.preferredName ?? `${patient.firstName} ${patient.lastName}`,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    language: patient.language,
  });

  const lockedInputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-100 flex items-center justify-between pointer-events-none select-none";
  const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white placeholder:text-gray-400";
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = "block text-sm font-semibold text-gray-900 mb-1.5";

  function handleSave() {
    onSave({ ...patient, preferredName: form.preferredName, gender: form.gender, phone: form.phone, email: form.email, language: form.language });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit patient info</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-2 space-y-4 flex-1">
          {/* Locked: First name */}
          <div>
            <label className={labelCls}>First name</label>
            <div className={lockedInputCls}>
              <span>{patient.firstName}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          {/* Locked: Last name */}
          <div>
            <label className={labelCls}>Last name</label>
            <div className={lockedInputCls}>
              <span>{patient.lastName}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          {/* Editable: Preferred name */}
          <div>
            <label className={labelCls}>Preferred name</label>
            <input className={inputCls} value={form.preferredName} onChange={e => setForm(f => ({ ...f, preferredName: e.target.value }))} />
          </div>
          {/* Locked: Date of birth */}
          <div>
            <label className={labelCls}>Date of birth</label>
            <div className={lockedInputCls}>
              <span>{patient.dob}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          {/* Editable: Gender */}
          <div>
            <label className={labelCls}>Gender</label>
            <div className="relative">
              <select className={selectCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Editable: Primary phone */}
          <div>
            <label className={labelCls}>Primary phone</label>
            <input className={inputCls} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          {/* Editable: Email */}
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          {/* Locked: Address */}
          <div>
            <label className={labelCls}>Address</label>
            <div className={lockedInputCls}>
              <span className="text-gray-400">{patient.address ?? "—"}</span>
              <Lock size={14} className="text-gray-400" />
            </div>
          </div>
          {/* Editable: Preferred language */}
          <div>
            <label className={labelCls}>Preferred language</label>
            <div className="relative">
              <select className={selectCls} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="" disabled>Preferred language</option>
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

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleSave} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── EditNotificationPreferencesModal ───────────────────────────────────────────

function EditNotificationPreferencesModal({ onClose }: { onClose: () => void }) {
  const [emailOn, setEmailOn] = useState(true);
  const [smsOn, setSmsOn] = useState(true);
  const [apptExpanded, setApptExpanded] = useState(true);
  const [patientExpanded, setPatientExpanded] = useState(false);
  const [checks, setChecks] = useState<Record<string, { email: boolean; sms: boolean }>>(
    Object.fromEntries(NOTIFICATION_TYPES.map(t => [t, { email: true, sms: true }]))
  );

  function toggleCheck(type: string, channel: "email" | "sms") {
    setChecks(prev => ({ ...prev, [type]: { ...prev[type], [channel]: !prev[type][channel] } }));
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
                <Toggle on={emailOn} onChange={setEmailOn} />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle on={smsOn} onChange={setSmsOn} />
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
          <button onClick={onClose} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── PatientSlidePanel ──────────────────────────────────────────────────────────

function PatientSlidePanel({ patient, onClose, onSavePatient }: {
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

// ── FormsSection ──────────────────────────────────────────────────────────────

function SyncBadge({ status, label }: { status: FormSyncStatus; label?: string }) {
  if (status === "syncing")      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"><RotateCcw size={11} className="animate-spin" />Syncing</span>;
  if (status === "sync-now")     return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500 text-white">Sync now</span>;
  if (status === "assign-sync")  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500 text-white">Assign &amp; sync</span>;
  if (status === "sync-failed")  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-red-500 border border-red-300"><WifiOff size={11} />Sync failed</span>;
  if (status === "date")         return <span className="text-xs font-medium text-emerald-600">{label}</span>;
  return null;
}

function FormBuilderView({ onExit }: { onExit: () => void }) {
  const [title, setTitle] = useState("New Form Title");
  const [template, setTemplate] = useState("");
  const [docType, setDocType] = useState("");
  const [displayType, setDisplayType] = useState("Wizard");
  const [pages, setPages] = useState(["Page 1"]);

  const QUESTIONS = [
    { icon: ">_", label: "Text Field" },
    { icon: "A",  label: "Text Area" },
    { icon: "@",  label: "Email" },
    { icon: "#",  label: "Number" },
    { icon: "☎",  label: "Phone Number" },
    { icon: "☑",  label: "Checkbox" },
    { icon: "⊞",  label: "Select Boxes" },
    { icon: "▾",  label: "Dropdown" },
    { icon: "✎",  label: "Signature" },
    { icon: "📅", label: "Date" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">Form Builder</h2>
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save and exit</button>
          <button onClick={onExit} className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"><X size={15} /></button>
        </div>
      </div>

      {/* Config row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-gray-50/50 flex-shrink-0 flex-wrap">
        <div className="relative">
          <select value={template} onChange={e => setTemplate(e.target.value)} className="pl-3 pr-8 py-1.5 border border-red-400 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[180px] focus:ring-2 focus:ring-red-100">
            <option value="">Select a Template</option>
            {FORM_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={docType} onChange={e => setDocType(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none min-w-[150px] focus:border-teal-400">
            <option value="">Document Type</option>
            <option>Medical</option><option>Dental</option><option>Insurance</option><option>Consent</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Display Type</span>
          <div className="relative">
            <select value={displayType} onChange={e => setDisplayType(e.target.value)} className="pl-3 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none bg-white appearance-none focus:border-teal-400">
              <option>Wizard</option><option>Single Page</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Title</span>
          <input value={title} onChange={e => setTitle(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white min-w-[160px]" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Questions sidebar */}
        <div className="w-48 border-r border-border bg-white flex-shrink-0 overflow-y-auto">
          <p className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-border">Questions</p>
          {QUESTIONS.map(q => (
            <button key={q.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing">
              <span className="text-gray-400 w-5 text-center font-mono text-xs">{q.icon}</span>
              {q.label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 overflow-y-auto">
          {/* Page tabs */}
          <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-border">
            {pages.map((page, i) => (
              <button key={i} className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 text-white">{page}</button>
            ))}
            <button onClick={() => setPages(p => [...p, `Page ${p.length + 1}`])} className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors px-2">
              <span className="text-base leading-none">+</span> Page
            </button>
          </div>

          {/* Drop zones */}
          <div className="p-6 space-y-4">
            {pages.map((page, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-gray-600 mb-2">{page}</p>
                <div className="bg-white rounded-xl border border-border p-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-lg px-6 py-10 text-center text-sm text-gray-400">
                    Drag and Drop a form component
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DigitizeModal({ onClose }: { onClose: () => void }) {
  const [hasFile, setHasFile] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-gray-900">Upload your forms</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></button>
        </div>
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-gray-600">Upload your documents to digitize them. We support PDF, JPG, PNG, DOC, and DOCX files up to 10MB each.</p>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); setHasFile(true); }}
            className={`border-2 border-dashed rounded-xl px-6 py-10 text-center transition-colors ${dragging ? "border-teal-400 bg-teal-50" : hasFile ? "border-teal-400 bg-teal-50/30" : "border-gray-200 bg-gray-50/30"}`}
          >
            <Upload size={28} className={`mx-auto mb-3 ${hasFile ? "text-teal-500" : "text-gray-400"}`} />
            <p className="text-sm font-semibold text-gray-700 mb-1">{hasFile ? "File ready to upload" : "Drag and drop files here"}</p>
            {!hasFile && <p className="text-xs text-gray-400 mb-4">or click to browse from your computer</p>}
            {!hasFile && (
              <label className="inline-block cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={() => setHasFile(true)} />
                <span className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Select Files</span>
              </label>
            )}
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
            <button
              disabled={!hasFile}
              onClick={onClose}
              className={`px-5 py-2 text-sm font-medium border rounded-lg transition-colors ml-auto ${hasFile ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-300 cursor-not-allowed"}`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Packet = { id: string; name: string; forms: string[] };

function NewPacketModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Packet) => void }) {
  const [name, setName] = useState("New Patient Packet");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set([
    "Cancellation Policy",
    "Consent for Internet Communications",
    "Credit Card Authorization Form",
    "Dental History Form",
    "Dental Insurance Verification Form",
  ]));

  const filtered = MANAGE_FORMS.filter(f => !search || f.toLowerCase().includes(search.toLowerCase()));
  const allFilteredSelected = filtered.every(f => selected.has(f));

  function toggle(form: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(form) ? next.delete(form) : next.add(form);
      return next;
    });
  }

  function selectAll()   { setSelected(new Set(MANAGE_FORMS)); }
  function deselectAll() { setSelected(new Set()); }

  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: `pkt-${Date.now()}`, name: name.trim(), forms: [...selected] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">New Packet</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-900 mb-2">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
            />
          </div>

          {/* Add forms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-900">Add forms to packet</label>
              <div className="flex items-center gap-3">
                <button onClick={selectAll}   className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">Select All</button>
                <button onClick={deselectAll} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">Deselect All</button>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl mb-3">
              <Search size={14} className="text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
              />
            </div>

            {/* Form list */}
            <div className="space-y-0">
              {filtered.map(form => (
                <label key={form} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 -mx-1 px-1 rounded-lg transition-colors">
                  <div
                    onClick={() => toggle(form)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-colors ${selected.has(form) ? "bg-gray-900 border-gray-900" : "border-gray-300 bg-white"}`}
                  >
                    {selected.has(form) && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-800">{form}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleSave} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ManageFormsView({ onBack, onBuild, onDigitize }: { onBack: () => void; onBuild: () => void; onDigitize: () => void }) {
  const [activeTab, setActiveTab] = useState<"forms" | "packets">("forms");
  const [search, setSearch] = useState("");
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [ellipsisOpen, setEllipsisOpen] = useState<string | null>(null);
  const [packets, setPackets] = useState<Packet[]>([
    { id: "pkt1", name: "New Patient Paperwork", forms: ["Cancellation Policy", "Consent for Internet Communications", "Medical History Form", "Patient Information Form"] },
    { id: "pkt2", name: "Insurance Verification", forms: ["Dental Insurance Verification Form", "Credit Card Authorization Form"] },
  ]);
  const [showNewPacket, setShowNewPacket] = useState(false);
  const newFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newFormRef.current && !newFormRef.current.contains(e.target as Node)) setNewFormOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = MANAGE_FORMS.filter(f => !search || f.toLowerCase().includes(search.toLowerCase()));

  const ELLIPSIS_ITEMS = [
    { label: "Edit details",       icon: <Edit size={14} /> },
    { label: "Preview",            icon: <Eye size={14} /> },
    { label: "Duplicate",          icon: <Copy size={14} /> },
    { label: "Download",           icon: <Download size={14} /> },
    { label: "Copy to locations",  icon: <MapPinned size={14} /> },
    { label: "Archive",            icon: <Archive size={14} />, danger: true },
  ];

  return (
    <>
    <div className="w-full min-w-0 px-6 py-5">
      {/* Back + heading */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors mb-2">
        <ArrowLeft size={14} /> Forms
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Manage Forms</h1>

      {/* Card */}
      <div className="bg-white rounded-xl border border-border overflow-visible">
        {/* Tab bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-1">
            {(["forms", "packets"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
              <Archive size={14} /> Archived forms
            </button>
            <button className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
              <Copy size={14} /> Copy to locations
            </button>
          </div>
        </div>

        {/* Search + action button — changes per tab */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 border border-gray-200 rounded-lg">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={activeTab === "packets" ? "Search packets" : "Search forms"} className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
          </div>

          {activeTab === "forms" ? (
            <div ref={newFormRef} className="relative">
              <button onClick={() => setNewFormOpen(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">
                New form <ChevronDown size={14} />
              </button>
              {newFormOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                  <button onClick={() => { setNewFormOpen(false); onDigitize(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <RefreshCw size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">Digitize <span className="text-gray-400">↗</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">Attach files and NexHealth will convert your forms.</p>
                      </div>
                    </div>
                  </button>
                  <div className="h-px bg-gray-100 mx-4" />
                  <button onClick={() => { setNewFormOpen(false); onBuild(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Wrench size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Build</p>
                        <p className="text-xs text-gray-500 mt-0.5">Create a new form by using the form builder.</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowNewPacket(true)} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
              New packet
            </button>
          )}
        </div>

        {/* Forms tab — table */}
        {activeTab === "forms" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1">Name <ChevronDown size={11} className="opacity-50" /></span>
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1"><Info size={11} className="text-gray-400" />Send automatically</span>
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(form => (
                <tr key={form} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-800 font-medium">{form}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-3 py-3 relative">
                    <button
                      onClick={() => setEllipsisOpen(ellipsisOpen === form ? null : form)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${ellipsisOpen === form ? "bg-teal-500 text-white" : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"}`}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {ellipsisOpen === form && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                        {ELLIPSIS_ITEMS.map(item => (
                          <button key={item.label} onClick={() => setEllipsisOpen(null)} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${item.danger ? "text-red-500" : "text-gray-700"}`}>
                            {item.icon}{item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Packets tab */}
        {activeTab === "packets" && (
          <div>
            {packets.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No packets yet. Click "New packet" to create one.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">
                      <span className="flex items-center gap-1">Name <ChevronDown size={11} className="opacity-50" /></span>
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">Forms included</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {packets
                    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                    .map(pkt => (
                      <tr key={pkt.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <ClipboardList size={15} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-800 font-medium">{pkt.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-gray-500">{pkt.forms.length} form{pkt.forms.length !== 1 ? "s" : ""}</span>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{pkt.forms.slice(0, 3).join(", ")}{pkt.forms.length > 3 ? "…" : ""}</p>
                        </td>
                        <td className="px-3 py-3 relative">
                          <button
                            onClick={() => setEllipsisOpen(ellipsisOpen === pkt.id ? null : pkt.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${ellipsisOpen === pkt.id ? "bg-teal-500 text-white" : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"}`}
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {ellipsisOpen === pkt.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setEllipsisOpen(null)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Edit size={14} />Edit</button>
                              <button onClick={() => setEllipsisOpen(null)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Copy size={14} />Duplicate</button>
                              <button onClick={() => { setPackets(prev => prev.filter(p => p.id !== pkt.id)); setEllipsisOpen(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50"><Archive size={14} />Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>

    {/* New Packet modal */}
    {showNewPacket && (
      <NewPacketModal
        onClose={() => setShowNewPacket(false)}
        onSave={pkt => setPackets(prev => [...prev, pkt])}
      />
    )}
    </>
  );
}

// ── RequestFormsModal ──────────────────────────────────────────────────────────

const QUICK_ADD_PACKETS = ["New Patient", "Quick Session", "Returning Patient"];

function MiniCalendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [viewDate, setViewDate] = useState(new Date(value));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72 z-50">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-sm font-bold text-gray-900">{monthName} {year}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = value.getDate() === day && value.getMonth() === month && value.getFullYear() === year;
          return (
            <button
              key={day}
              onClick={() => onChange(new Date(year, month, day))}
              className={`w-9 h-9 flex items-center justify-center text-sm rounded-full mx-auto transition-colors ${
                isSelected ? "bg-gray-900 text-white font-bold" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RequestFormsModal({ onClose }: { onClose: () => void }) {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  const [formSearch, setFormSearch] = useState("");
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [showFormDrop, setShowFormDrop] = useState(false);

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [showCalendar, setShowCalendar] = useState(false);

  const [customizeMsg, setCustomizeMsg] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  const patientMatches = INITIAL_PATIENTS.filter(p =>
    !p.archived && patientSearch.length > 0 &&
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const formMatches = MANAGE_FORMS.filter(f =>
    formSearch.length > 0 && f.toLowerCase().includes(formSearch.toLowerCase()) && !selectedForms.includes(f)
  );

  const canSend = selectedPatient.length > 0 && selectedForms.length > 0;

  const fmtExpiry = expiryDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function addForm(f: string) {
    setSelectedForms(prev => prev.includes(f) ? prev : [...prev, f]);
    setFormSearch("");
    setShowFormDrop(false);
  }

  function addQuickAdd(label: string) {
    const map: Record<string, string[]> = {
      "New Patient": ["Patient Information Form", "Medical History Form", "HIPAA Notice"],
      "Quick Session": ["Consent for Internet Communications"],
      "Returning Patient": ["Dental History Form", "Credit Card Authorization Form"],
    };
    (map[label] ?? []).forEach(f => setSelectedForms(prev => prev.includes(f) ? prev : [...prev, f]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">New form request</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Patients will receive an email and text message from your{" "}
              <button className="text-blue-600 underline">form request template</button>.
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 ml-3 flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-5">

          {/* Send to */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Send to</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors ${showPatientDrop ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-200"}`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={selectedPatient || patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(""); setShowPatientDrop(true); }}
                  onFocus={() => setShowPatientDrop(true)}
                  placeholder="Search by name, date of birth, email, or phone"
                  className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
                />
                {selectedPatient && <button onClick={() => { setSelectedPatient(""); setPatientSearch(""); }} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>}
              </div>
              {showPatientDrop && patientMatches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {patientMatches.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPatient(`${p.firstName} ${p.lastName}`); setPatientSearch(""); setShowPatientDrop(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-lg bg-gray-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{p.initials}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-gray-400">{p.dob}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Find an existing patient or send to a phone/email address</p>
          </div>

          {/* Forms */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Forms</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors ${showFormDrop ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-200"}`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={formSearch}
                  onChange={e => { setFormSearch(e.target.value); setShowFormDrop(true); }}
                  onFocus={() => setShowFormDrop(true)}
                  placeholder="Choose forms"
                  className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
                />
              </div>
              {showFormDrop && formMatches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {formMatches.map(f => (
                    <button key={f} onClick={() => addForm(f)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-800">{f}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected forms */}
            {selectedForms.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedForms.map(f => (
                  <div key={f} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                    <button onClick={() => setSelectedForms(prev => prev.filter(x => x !== f))} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-add pills */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {QUICK_ADD_PACKETS.map(label => (
                <button key={label} onClick={() => addQuickAdd(label)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <span className="text-teal-500">+</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiration date */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm font-bold text-gray-900">Expiration date</label>
              <Info size={13} className="text-gray-400" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Calendar size={14} className="text-gray-400" />
                  {fmtExpiry}
                </div>
                <button onClick={() => setShowCalendar(v => !v)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit size={14} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Set by your default expiration date.{" "}
                <button className="text-blue-500 hover:underline">Update settings</button>
              </p>
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <MiniCalendar value={expiryDate} onChange={d => { setExpiryDate(d); setShowCalendar(false); }} />
                </div>
              )}
              {showCalendar && (
                <button onClick={() => { setExpiryDate(defaultExpiry); setShowCalendar(false); }} className="text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors">Reset</button>
              )}
            </div>
          </div>

          {/* Customize message */}
          <div className={`rounded-xl border transition-colors ${customizeMsg ? "border-gray-200 bg-gray-50 p-4" : "p-0"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Customize message</span>
              <Toggle on={customizeMsg} onChange={setCustomizeMsg} />
            </div>

            {customizeMsg && (
              <div className="mt-4 space-y-4">
                {/* SMS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-gray-800">SMS message</label>
                    <span className="text-xs font-medium text-teal-600">{smsMsg.length} characters</span>
                  </div>
                  <textarea
                    value={smsMsg}
                    onChange={e => setSmsMsg(e.target.value)}
                    rows={2}
                    placeholder={`Good morning, ${selectedPatient.split(" ")[0] || "Patient"}! Please fill out these forms.`}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 resize-none bg-white placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Customize the text sent out. Leave blank for the default message.</p>
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Email</label>
                  <input
                    value={emailMsg}
                    onChange={e => setEmailMsg(e.target.value)}
                    placeholder={selectedPatient ? `${selectedPatient.toLowerCase().replace(" ", "")}@email.com` : "Email address"}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 bg-white placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">Add additional notes to emails when patients follow the link.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            disabled={!canSend}
            onClick={onClose}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-colors ${canSend ? "bg-teal-500 hover:bg-teal-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            Send
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FormsListView({ onManage }: { onManage: () => void }) {
  const [activeTab, setActiveTab] = useState<"active" | "synced" | "expired" | "all">("active");
  const [search, setSearch] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  const filtered = FORM_SUBMISSIONS.filter(s =>
    !search || s.patient.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
        <div className="flex items-center gap-2">
          <button onClick={onManage} className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Manage forms
          </button>
          <button className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Settings
          </button>
          <button className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Templates
          </button>
          <button onClick={() => setShowRequestModal(true)} className="px-4 py-1.5 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors">
            Request forms
          </button>
        </div>
      </div>

      {/* Tab bar + filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
          {(["active", "synced", "expired", "all"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white text-sm">
            <Search size={13} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a patient" className="outline-none text-gray-700 placeholder:text-gray-400 bg-transparent w-32" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white">
            Filter by <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="w-8 px-4 py-2.5" />
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Patients <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Expiration date <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">Forms</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Status <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="w-4 h-4 rounded accent-teal-500" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {row.initials}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{row.patient}</p>
                      <p className="text-xs text-gray-400">{row.submitted}</p>
                      <p className="text-xs text-gray-400">{row.device}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{row.expiration || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <FileText size={13} className="text-blue-400" />
                    {row.formName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">{row.completedStatus}</span>
                    <SyncBadge status={row.syncStatus} label={row.syncLabel} />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    {showRequestModal && <RequestFormsModal onClose={() => setShowRequestModal(false)} />}
    </>
  );
}

function FormsSection() {
  const [view, setView] = useState<"list" | "manage" | "builder" | "digitize">("list");

  if (view === "builder") return <FormBuilderView onExit={() => setView("manage")} />;

  return (
    <>
      {view === "list"    && <FormsListView   onManage={() => setView("manage")} />}
      {view === "manage"  && <ManageFormsView onBack={() => setView("list")} onBuild={() => setView("builder")} onDigitize={() => setView("digitize")} />}
      {view === "digitize" && (
        <>
          <ManageFormsView onBack={() => setView("list")} onBuild={() => setView("builder")} onDigitize={() => setView("digitize")} />
          <DigitizeModal onClose={() => setView("manage")} />
        </>
      )}
    </>
  );
}

// ── PlaceholderView ────────────────────────────────────────────────────────────

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm">This section is coming soon.</p>
    </div>
  );
}

// ── GlobalSearch ───────────────────────────────────────────────────────────────

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length > 0
    ? PATIENT_RESULTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className={`flex items-center gap-2 px-3 py-2 bg-white rounded-full border transition-all ${open ? "border-gray-300 shadow-md" : "border-gray-200 hover:border-gray-300"}`}>
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search patients" className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
        {query ? (
          <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 hover:bg-gray-500 transition-colors"><X size={11} className="text-white" /></button>
        ) : (
          <span className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 font-mono flex-shrink-0">⌘K</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {results.map(patient => (
            <div key={patient.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => { setQuery(patient.name); setOpen(false); }}>
              <PatientAvatar initials={patient.initials} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{patient.name}</p>
                <p className="text-sm text-gray-500">{patient.dob}</p>
                <p className="text-sm text-gray-500">{patient.phone}</p>
                <p className="text-sm text-gray-500">{patient.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><MessageSquare size={16} /></button>
                <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><FileText size={16} /></button>
                <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><DollarSign size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LocationPicker ─────────────────────────────────────────────────────────────

function LocationPicker() {
  const { locations, activeLocation, switchLocation } = useAuth();
  const [open, setOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = locations.filter(l => !locSearch || l.name.toLowerCase().includes(locSearch.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setLocSearch(""); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSelect(loc: ApiLocation) {
    if (loc.id === activeLocation?.id) { setOpen(false); setLocSearch(""); return; }
    setSwitching(loc.id);
    try {
      await switchLocation(loc.id);
      setOpen(false);
      setLocSearch("");
    } finally {
      setSwitching(null);
    }
  }

  // With only one (or no) location there is nothing to switch between — show a
  // static label, mirroring the product's behavior.
  const label = activeLocation?.name ?? "No location";
  const single = locations.length <= 1;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { if (!single) setOpen(v => !v); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors font-medium"
      >
        <MapPin size={13} className="text-teal-500" />
        <span className="max-w-[200px] truncate">{label}</span>
        {!single && <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && !single && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-gray-900 mb-2">Locations</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-teal-400 bg-white">
              <Search size={13} className="text-gray-400" />
              <input autoFocus value={locSearch} onChange={e => setLocSearch(e.target.value)} placeholder="Search" className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-72 pb-2">
            {filtered.map(loc => (
              <button key={loc.id} disabled={switching !== null} onClick={() => handleSelect(loc)} className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-60">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{loc.address}</p>
                </div>
                {loc.id === activeLocation?.id && <Check size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ communications: true, scheduling: true });
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center mr-2.5 flex-shrink-0">
          <span className="text-white text-sm font-bold" style={{ fontFamily: "serif" }}>n</span>
        </div>
        <span className="font-semibold text-sm text-foreground tracking-tight">nexhealth</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const hasChildren = !!item.children;
          const isExpanded = expanded[item.id];
          const isActive = activeNav === item.id;
          return (
            <div key={item.id}>
              <button
                onClick={() => { if (hasChildren) toggle(item.id); else setActiveNav(item.id); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${isActive ? "bg-gray-900 text-white font-medium shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={isActive ? "text-white" : "text-gray-400"}>{item.icon}</span>
                  {item.label}
                </span>
                <span className="flex items-center gap-1">
                  {item.badge && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{item.badge}</span>}
                  {hasChildren && <span className={isActive ? "text-white/70" : "text-gray-400"}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>}
                </span>
              </button>
              {hasChildren && isExpanded && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {item.children!.map(child => (
                    <button key={child.id} onClick={() => setActiveNav(child.id)} className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${activeNav === child.id ? "text-teal-600 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────────

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center hover:opacity-90 transition-opacity">
        {user?.initials ?? <User size={16} />}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || "—"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{user?.role}</span>
          </div>
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
            <LogOut size={15} className="text-gray-400" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 lg:hidden"><Menu size={18} /></button>
      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 hidden sm:flex">
        <span className="text-white text-xs font-bold" style={{ fontFamily: "serif" }}>n</span>
      </div>
      <GlobalSearch />
      <div className="flex-1 hidden lg:block" />
      <LocationPicker />
      <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
      <button
        type="button"
        onClick={onOpenSettings}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
      <UserMenu />
    </header>
  );
}

// ── StatCards ──────────────────────────────────────────────────────────────────

function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {STAT_CARDS.map(card => (
        <div key={card.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm" style={{ borderTop: `3px solid ${card.color}` }}>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-bold text-foreground leading-none">{card.value}</p>
                <p className="text-sm font-semibold text-gray-800 mt-2 leading-snug">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.period}</p>
              </div>
              <div className="p-2.5 rounded-lg flex-shrink-0" style={{ backgroundColor: card.bg, color: card.color }}>{card.icon}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border leading-relaxed">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AppointmentsTable ──────────────────────────────────────────────────────────

function AppointmentsTable({ appointments, patients, onStatusChange, onOpenPanel }: {
  appointments: Appointment[]; patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenPanel: (p: Patient) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "unconfirmed">("all");
  const [search, setSearch] = useState("");

  const filtered = appointments.filter(a => {
    const matchesTab = activeTab === "all" || (activeTab === "confirmed" && a.status === "confirmed") || (activeTab === "unconfirmed" && a.status === "unconfirmed");
    const matchesSearch = !search || a.patient.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    all: appointments.length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    unconfirmed: appointments.filter(a => a.status === "unconfirmed").length,
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm w-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3 border-b border-border bg-white">
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", "confirmed", "unconfirmed"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} <span className={`ml-0.5 ${activeTab === tab ? "opacity-80" : "opacity-60"}`}>({counts[tab]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm text-gray-400 bg-white min-w-[180px]">
            <Search size={13} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter patients" className="outline-none bg-transparent text-gray-700 placeholder:text-gray-400 w-full min-w-0" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium bg-white">
            <Filter size={13} />Filter by<ChevronDown size={13} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/80">
              {[
                { label: "Time", className: "text-left px-4 py-2.5" },
                { label: "Status", className: "text-left px-4 py-2.5" },
                { label: "Patient", className: "text-left px-4 py-2.5 min-w-[200px]" },
                { label: "Contact", className: "text-left px-4 py-2.5 min-w-[180px]" },
                { label: "Details", className: "text-left px-4 py-2.5" },
                { label: "Insurance", className: "text-center px-2 py-2.5 w-24" },
                { label: "Forms", className: "text-center px-2 py-2.5 w-24" },
                { label: "", className: "text-right px-3 py-2.5 w-16" },
              ].map((col, i) => (
                <th key={i} className={`text-xs font-semibold text-muted-foreground whitespace-nowrap ${col.className}`}>
                  {col.label && <span className="inline-flex items-center gap-1">{col.label}{col.label !== "" && <ChevronDown size={11} className="opacity-50" />}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(appt => {
              const fullPatient = patients.find(p => p.id === appt.patientId);
              return (
                <tr
                  key={appt.id}
                  onClick={() => fullPatient && onOpenPanel(fullPatient)}
                  className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-foreground">{appt.time}</div>
                    <div className="text-xs text-muted-foreground">{appt.duration}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <StatusDropdown appointmentId={appt.id} status={appt.status} onStatusChange={onStatusChange} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <PatientAvatar initials={appt.patient.initials} color={appt.patient.color} />
                      <div>
                        <div className="font-medium text-foreground">{appt.patient.name}</div>
                        <div className="text-xs text-muted-foreground">{appt.patient.dob}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-foreground ${appt.contact.redacted ? "blur-[4px] select-none" : ""}`}>{appt.contact.phone}</div>
                    <div className={`text-xs text-muted-foreground ${appt.contact.redacted ? "blur-[4px] select-none" : ""}`}>{appt.contact.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-foreground">{appt.details.provider}</div>
                    <div className="text-xs text-muted-foreground">{appt.details.type}</div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {appt.insurance === "pending" ? <Clock size={16} className="text-gray-400 mx-auto" /> : <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {appt.forms === "complete" ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <AlertCircle size={16} className="text-amber-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"><Info size={14} /></button>
                      <button className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"><MoreHorizontal size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── HomeDashboard ──────────────────────────────────────────────────────────────

function HomeDashboard({ appointments, patients, onStatusChange, onOpenPanel }: {
  appointments: Appointment[]; patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenPanel: (p: Patient) => void;
}) {
  const [dateOffset, setDateOffset] = useState(0);
  const displayDate = dateOffset === 0 ? "Today" : dateOffset === 1 ? "Tomorrow" : dateOffset === -1 ? "Yesterday" : dateOffset > 0 ? `+${dateOffset} days` : `${dateOffset} days`;

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <StatCards />
      <div className="flex items-center gap-2">
        <button onClick={() => setDateOffset(d => d - 1)} className="p-1.5 rounded-md border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
        <button onClick={() => setDateOffset(d => d + 1)} className="p-1.5 rounded-md border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"><ChevronRight size={16} /></button>
        <h2 className="text-xl font-semibold text-foreground">{displayDate}</h2>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-lg border border-blue-200 border-l-4 border-l-sky-500 bg-blue-50 text-sm shadow-sm">
        <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <p className="text-gray-700 flex-1 leading-relaxed">
          You have <span className="font-semibold text-blue-700">6 open slots</span> in the next 5 days. Fill open slots in minutes by sending a waitlist request.
        </p>
        <button className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors whitespace-nowrap self-start sm:self-auto">
          Fill open slots <ArrowRight size={14} />
        </button>
      </div>
      <AppointmentsTable appointments={appointments} patients={patients} onStatusChange={onStatusChange} onOpenPanel={onOpenPanel} />
    </div>
  );
}

// ── CreatePatientModal ─────────────────────────────────────────────────────────

function CreatePatientModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Patient) => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", gender: "", email: "", phone: "", provider: "", dob: "", language: "" });

  function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    onSave({
      id: `p-${Date.now()}`, firstName: form.firstName, lastName: form.lastName,
      dob: form.dob || "—", gender: form.gender || "—", email: form.email, phone: form.phone,
      provider: form.provider || "Nick Riviera", language: form.language || "English",
      initials: (form.firstName[0] + form.lastName[0]).toUpperCase(), synced: false, archived: false,
      insuranceData: { status: "unknown", name: "Unknown" },
    });
    onClose();
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
          <button onClick={handleSave} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── PatientsSection ────────────────────────────────────────────────────────────

function PatientsListView({ patients, onOpenPanel, onCreateOpen, onViewArchived }: {
  patients: Patient[]; onOpenPanel: (p: Patient) => void;
  onCreateOpen: () => void; onViewArchived: () => void;
}) {
  const active = patients.filter(p => !p.archived);
  const [search, setSearch] = useState("");
  const filtered = active.filter(p => !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <div className="flex items-center gap-3">
          <button onClick={onViewArchived} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">View archived patients</button>
          <button onClick={onCreateOpen} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-800">Create patient</button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg max-w-xs">
        <Search size={14} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients…" className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent" />
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 font-semibold text-gray-800">Name ({filtered.length})</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-800">Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(patient => (
              <tr key={patient.id} onClick={() => onOpenPanel(patient)} className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <PatientAvatar initials={patient.initials} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
                        {!patient.synced && <SyncTooltip />}
                      </div>
                      <p className="text-xs text-gray-500">{patient.dob}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-gray-700">{patient.phone}</p>
                  <p className="text-xs text-gray-500">{patient.email}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArchivedPatientsView({ patients, onOpenPanel, onBack, onUnarchive }: {
  patients: Patient[]; onOpenPanel: (p: Patient) => void;
  onBack: () => void; onUnarchive: (id: string) => void;
}) {
  const archived = patients.filter(p => p.archived);
  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
          <ArrowLeft size={15} />Back to patients
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Archived patients</h1>
      </div>
      {archived.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-gray-400">No archived patients</div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Name ({archived.length})</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Contact</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {archived.map(patient => (
                <tr key={patient.id} onClick={() => onOpenPanel(patient)} className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <PatientAvatar initials={patient.initials} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium border border-pink-400 text-pink-600 rounded">Archived</span>
                        </div>
                        <p className="text-xs text-gray-500">{patient.dob}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-gray-700">{patient.phone}</p>
                    <p className="text-xs text-gray-500">{patient.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onUnarchive(patient.id)}
                      className="px-3 py-1.5 text-sm font-medium border border-pink-400 text-pink-600 rounded-lg hover:bg-pink-50 transition-colors whitespace-nowrap"
                    >
                      Unarchive patient
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PatientsSection({ patients, setPatients, onOpenPanel }: {
  patients: Patient[]; setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  onOpenPanel: (p: Patient) => void;
}) {
  const [view, setView] = useState<"list" | "archived">("list");
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      {view === "list" ? (
        <PatientsListView patients={patients} onOpenPanel={onOpenPanel} onCreateOpen={() => setShowCreate(true)} onViewArchived={() => setView("archived")} />
      ) : (
        <ArchivedPatientsView
          patients={patients}
          onOpenPanel={onOpenPanel}
          onBack={() => setView("list")}
          onUnarchive={(id) => setPatients(prev => prev.map(p => p.id === id ? { ...p, archived: false } : p))}
        />
      )}
      {showCreate && <CreatePatientModal onClose={() => setShowCreate(false)} onSave={p => setPatients(prev => [p, ...prev])} />}
    </>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

// ── LoginPage ──────────────────────────────────────────────────────────────────

const LOGIN_SLIDES = [
  {
    tag: "VERIFICATION",
    headline: ["Collect & verify", "insurance"],
    rest: "when patients fill out forms",
    sub: "Available for practices with verification and forms.",
  },
  {
    tag: "SCHEDULING",
    headline: ["Online booking", "made simple"],
    rest: "for your entire practice",
    sub: "Patients book 24/7 — no phone calls required.",
  },
  {
    tag: "FORMS",
    headline: ["Paperless intake", "forms"],
    rest: "patients love to fill out",
    sub: "Collect signatures, insurance, and more digitally.",
  },
];

function LoginPage() {
  const { login, providers } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [slide, setSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % LOGIN_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Surface any SSO error returned via ?sso_error= on the redirect back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoErr = params.get("sso_error");
    if (ssoErr) {
      setError(decodeURIComponent(ssoErr));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleLogin() {
    if (submitting) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // On success the AuthProvider flips status → the app renders the shell.
    } catch (err: any) {
      setError(err?.detail || "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    if (submitting) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setNotice("If an account exists for that email, a reset link has been sent.");
      setForgotMode(false);
    } catch (err: any) {
      setError(err?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const anySso = providers.google || providers.azure || providers.okta;
  const current = LOGIN_SLIDES[slide];

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-[48%] flex-shrink-0 flex flex-col justify-between p-14" style={{ backgroundColor: "#eae6e1" }}>
        <div />

        {/* Slide content */}
        <div className="max-w-sm">
          {/* Tag */}
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={15} className="text-blue-500" />
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">{current.tag}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl leading-tight mb-4" style={{ fontFamily: "'Georgia', serif" }}>
            <span className="font-black text-gray-900">{current.headline[0]}<br />{current.headline[1]}</span>{" "}
            <span className="font-normal text-gray-700">{current.rest}</span>
          </h1>

          <p className="text-sm text-gray-500 mb-10">{current.sub}</p>

          <button className="flex items-center gap-3 px-6 py-3.5 border-2 border-gray-900 rounded-full text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
            Talk with our team <ArrowRight size={16} />
          </button>
        </div>

        {/* Slide dots */}
        <div className="flex items-center gap-2 pb-2">
          {LOGIN_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slide ? "w-8 h-2.5 bg-gray-800" : "w-2.5 h-2.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center px-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold" style={{ fontFamily: "serif", letterSpacing: "-0.05em" }}>n</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Log in to NexHealth</h2>
          </div>

          {/* Error / notice banners */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
              {notice}
            </div>
          )}

          {/* Form */}
          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); forgotMode ? handleForgot() : handleLogin(); }}
          >
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* Password (hidden in forgot mode) */}
            {!forgotMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-800">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(null); setNotice(null); }}
                    className="text-sm text-teal-500 hover:text-teal-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#2dd4bf" }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = "#14b8a6"; }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#2dd4bf")}
            >
              {submitting ? "Please wait…" : forgotMode ? "Send reset link" : "Log in"}
            </button>

            {forgotMode && (
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(null); setNotice(null); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to log in
              </button>
            )}
          </form>

          {/* SSO — only shown when at least one provider is configured */}
          {!forgotMode && anySso && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-3">
                {providers.google && (
                  <a
                    href={ssoLoginUrl("google")}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18L12.048 13.56c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.042L3.964 10.71z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345L15.02 2.34C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </a>
                )}
                {providers.azure && (
                  <a
                    href={ssoLoginUrl("azure")}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                      <rect width="10" height="10" fill="#F25022"/>
                      <rect x="11" width="10" height="10" fill="#7FBA00"/>
                      <rect y="11" width="10" height="10" fill="#00A4EF"/>
                      <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                    </svg>
                    Continue with Azure
                  </a>
                )}
                {providers.okta && (
                  <a
                    href={ssoLoginUrl("okta")}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-[18px] h-[18px] rounded-full border-[3px] border-gray-800" />
                    Continue with Okta
                  </a>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-10">
            © 2026 NexHealth • The Patient Experience Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { status } = useAuth();
  const [activeNav, setActiveNav] = useState("home");
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [panelPatient, setPanelPatient] = useState<Patient | null>(null);

  const isResetPassword =
    window.location.pathname === "/reset-password" ||
    window.location.pathname.endsWith("/reset-password");

  function handleStatusChange(id: string, status: AppointmentStatus) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  function handleSavePatient(updated: Patient) {
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
    setPanelPatient(updated);
  }

  // Keep panel in sync when patient data changes
  const currentPanelPatient = panelPatient
    ? patients.find(p => p.id === panelPatient.id) ?? panelPatient
    : null;

  if (isResetPassword) {
    return <ResetPasswordPage />;
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-teal-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") return <LoginPage />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar onOpenSettings={() => setActiveNav("settings")} />
      <div className="flex flex-1 overflow-hidden">
        {activeNav !== "settings" && (
          <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          {activeNav === "settings"    ? <SettingsSection onBack={() => setActiveNav("home")} />
          : activeNav === "patients"     ? <PatientsSection patients={patients} setPatients={setPatients} onOpenPanel={setPanelPatient} />
          : activeNav === "forms"       ? <FormsSection />
          : activeNav === "payments"    ? <PlaceholderView title="Payments" />
          : activeNav === "verification"? <PlaceholderView title="Verification" />
          : <HomeDashboard appointments={appointments} patients={patients} onStatusChange={handleStatusChange} onOpenPanel={setPanelPatient} />}
        </main>
      </div>

      {/* Slide panel */}
      {currentPanelPatient && (
        <PatientSlidePanel
          patient={currentPanelPatient}
          onClose={() => setPanelPatient(null)}
          onSavePatient={handleSavePatient}
        />
      )}
    </div>
  );
}
