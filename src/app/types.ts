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

export type NotificationPrefs = {
  email: boolean;
  sms: boolean;
  types: Record<string, { email: boolean; sms: boolean }>;
};

export type Patient = {
  id: string; firstName: string; lastName: string; dob: string; gender: string;
  email: string; phone: string; provider: string; language: string;
  initials: string; synced: boolean; archived: boolean;
  preferredName?: string; address?: string;
  insuranceData?: InsuranceData;
  notificationPrefs?: NotificationPrefs;
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

export type FormPacket = {
  id: string;
  name: string;
  formTemplateIds: string[];
  createdAt: string;
};

export type FormFieldType =
  | "text" | "textarea" | "email" | "number" | "phone"
  | "checkbox" | "select_boxes" | "dropdown" | "radio"
  | "date" | "date_entry" | "address" | "file" | "signature"
  | "insurance" | "preferred_language" | "payment"
  | "content" | "location_logo";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options: string[];
  page: number;
  minLength: number | null;
  maxLength: number | null;
  conditionalFieldId: string | null;
  conditionalValue: string;
};

export type FormTemplateSource = "build" | "digitize";
export type FormTemplateStatus = "active" | "digitizing";
export type FormDisplayType = "wizard" | "single_page";

export type FormTemplate = {
  id: string;
  name: string;
  documentType: string;
  source: FormTemplateSource;
  status: FormTemplateStatus;
  displayType: FormDisplayType;
  fields: FormField[];
  pageCount: number;
  uploadedFileUrl: string | null;
  digitizeNotes: string;
  archivedAt: string | null;
  createdAt: string;
};

// ── Scheduling: appointment types & mapping rules ─────────────────────────────────

export type PatientTypeRule = "new" | "existing" | "all";

export type InsertionRule = { id: string; codeType: string; codes: string[] };

export type AppointmentType = {
  id: string;
  name: string;
  durationMinutes: number;
  availableOnline: boolean;
  patientType: PatientTypeRule;
  allowPatientCancel: boolean;
  insertionRules: InsertionRule[];
};

export type MappingField = "visit_type" | "service_type" | "procedure_code" | "operatory" | "provider";

export type MappingCondition = { field: MappingField; values: string[] };

export type MappingRule = {
  id: string;
  targetAppointmentTypeId: string;
  conditions: MappingCondition[];
  position: number;
};

// ── Scheduling: providers, operatories & availability ─────────────────────────────

export type ProviderStatus = "active" | "inactive";

export type Provider = {
  id: string;
  name: string;
  role: string;
  status: ProviderStatus;
  defaultAppointmentTypeIds: string[];
  defaultInsurances: string[];
  appointmentTypeDurations: Record<string, number>;
  avatarUrl: string | null;
};

export type Operatory = {
  id: string;
  name: string;
  active: boolean;
};

export type RepeatMode = "once" | "weekly";

export type AvailabilitySlot = {
  id: string;
  providerId: string;
  operatoryId: string | null;
  repeatMode: RepeatMode;
  specificDate: string | null;
  dayOfWeek: number | null;
  startsOn: string | null;
  startTime: string;
  endTime: string;
  useProviderDefaults: boolean;
  appointmentTypeIds: string[];
};

export type AvailabilityBlock = {
  id: string;
  providerId: string;
  operatoryId: string | null;
  startsAt: string;
  endsAt: string;
  notes: string;
};

// ── Scheduling: custom booking form fields & insurance ────────────────────────

export type BookingFieldType = "text" | "note" | "single_select" | "multi_select" | "payment";

export type BookingFormField = {
  id: string;
  fieldType: BookingFieldType;
  label: string;
  showTo: PatientTypeRule;
  required: boolean;
  noteText: string;
  options: string[];
  position: number;
};

export type BookingInsurance = {
  id: string;
  name: string;
};

// ── Scheduling: waitlist requests ──────────────────────────────────────────────

export type WaitlistRequestStatus = "sent" | "cancelled";

export type WaitlistRequestSlot = {
  id: string;
  providerId: string;
  operatoryId: string | null;
  startsAt: string;
  endsAt: string;
  claimedByPatientId: string | null;
  claimedAt: string | null;
  createdAppointmentId: string | null;
  cancelledAt: string | null;
};

export type WaitlistRequestPatient = {
  id: string;
  patientId: string;
  name: string;
  notifiedAt: string | null;
};

export type WaitlistRequest = {
  id: string;
  status: WaitlistRequestStatus;
  createdAt: string;
  sentAt: string;
  slots: WaitlistRequestSlot[];
  patients: WaitlistRequestPatient[];
};

export type WaitlistPatientCandidate = {
  id: string;
  name: string;
  reason: "missed" | "cancelled";
  appointmentAt: string | null;
};
