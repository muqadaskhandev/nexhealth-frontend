import type { ReactNode } from "react";

// ── Navigation ─────────────────────────────────────────────────────────────────

export type NavItem = {
  id: string; label: string; icon: ReactNode;
  badge?: number; children?: { id: string; label: string }[];
};

// ── Appointments ─────────────────────────────────────────────────────────────────

export type AppointmentStatus = "checked-in" | "confirmed" | "unconfirmed" | "cancelled";

export type Appointment = {
  id: string; patientId: string; time: string; duration: string;
  status: AppointmentStatus;
  patient: { name: string; dob: string; initials: string; color: string };
  contact: { phone: string; email: string; redacted?: boolean };
  details: { provider: string; type: string };
  insurance: "pending" | "verified"; forms: "complete" | "incomplete";
};

// ── Patients ─────────────────────────────────────────────────────────────────────

export type EligibilityStatus = "active" | "unverified" | "self-pay" | "inactive" | "unknown";

export type InsuranceData = {
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

export type Patient = {
  id: string; firstName: string; lastName: string; dob: string; gender: string;
  email: string; phone: string; provider: string; language: string;
  initials: string; synced: boolean; archived: boolean;
  preferredName?: string; address?: string;
  insuranceData?: InsuranceData;
};

export type ActivityType = "appointment" | "message" | "form" | "payment" | "verification" | "note";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  createdAt: string;
};

export type MessageItem = {
  id: string;
  body: string;
  direction: string;
  channel: string;
  sentAt: string;
};

// ── Forms ────────────────────────────────────────────────────────────────────────

export type FormSyncStatus = "syncing" | "sync-now" | "assign-sync" | "sync-failed" | "date" | "complete";

export type FormSubmission = {
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

export type Packet = { id: string; name: string; forms: string[] };
