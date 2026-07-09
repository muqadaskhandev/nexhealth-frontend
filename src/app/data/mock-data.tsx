import {
  Home, Activity, Users, FileText, MessageSquare, Calendar, CreditCard,
  ClipboardList, ShieldCheck, CheckCircle2,
} from "lucide-react";
import type { NavItem, Appointment, Patient } from "../types";

// ── Navigation ─────────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
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

// ── Dashboard ──────────────────────────────────────────────────────────────────

export const STAT_CARDS = [
  { id: "confirmed",    value: 2,  label: "Appointments confirmed",      period: "Last 90 days", description: "Prevent no shows with regular reminders.",          color: "#d946ef", bg: "#fdf4ff", icon: <CheckCircle2 size={20} /> },
  { id: "new-patients", value: 31, label: "New patients",                period: "Last 90 days", description: "We love seeing your practice grow!",                color: "#38bdf8", bg: "#f0f9ff", icon: <Users size={20} /> },
  { id: "booked-online",value: 87, label: "Appointments booked online",  period: "Last 90 days", description: "That's 87 phone calls you didn't have to make.",    color: "#fb923c", bg: "#fff7ed", icon: <Calendar size={20} /> },
];

// ── Seed data ──────────────────────────────────────────────────────────────────

export const INITIAL_APPOINTMENTS: Appointment[] = [
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

export const INITIAL_PATIENTS: Patient[] = [
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
