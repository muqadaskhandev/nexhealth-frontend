import type { ReactNode } from "react";

// ── Navigation ─────────────────────────────────────────────────────────────────

export type NavItem = {
  id: string; label: string; icon: ReactNode;
  badge?: number; children?: { id: string; label: string }[];
};

// ── Appointments ─────────────────────────────────────────────────────────────────

export type AppointmentStatus = "checked-in" | "confirmed" | "unconfirmed" | "cancelled";

export type Appointment = {
  id: string; patientId: string; time: string; duration: string; startsAt: string;
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
  publicCode: string | null;
  createdAt: string;
};

export type FormRequestBatchStatus = "active" | "expired" | "synced";
export type FormRequestCompletedStatus = "sent" | "viewed" | "in_progress" | "complete";

export type FormRequestBatch = {
  patientId: string;
  patientName: string;
  patientInitials: string;
  requestIds: string[];
  sentAt: string;
  expiresAt: string;
  forms: { id: string; name: string }[];
  status: FormRequestBatchStatus;
  completedStatus: FormRequestCompletedStatus;
  syncStatus: "sync-now" | "sync-failed" | null;
};

export type FormFieldType =
  | "text" | "textarea" | "email" | "number" | "phone"
  | "checkbox" | "select_boxes" | "dropdown" | "radio"
  | "date" | "date_entry" | "address" | "file" | "signature"
  | "insurance" | "preferred_language" | "payment"
  | "content" | "location_logo" | "columns" | "panel"
  | "medical_alerts_dropdown" | "medical_alerts_radio";

export type FormFieldLabelPosition = "top" | "left";
export type FormFieldWidth = "full" | "half";

export type MedicalAlertCategory = "condition" | "allergy" | "medication";

export type MedicalAlert = {
  id: string;
  category: MedicalAlertCategory;
  label: string;
  active: boolean;
  flash: boolean;
  sortOrder: number;
  snomedCode: string | null;
};

export type MedicalAlertCatalog = Record<MedicalAlertCategory, { id: string; label: string }[]>;

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
  labelPosition: FormFieldLabelPosition;
  syncTarget: string | null;
  placeholder: string;
  defaultValue: string;
  width: FormFieldWidth;
};

export type FormTemplateSource = "build" | "digitize";
export type FormTemplateStatus = "active" | "digitizing";
export type FormDisplayType = "wizard" | "single_page";
export type RulePatientStatus = "any" | "new" | "existing";

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
  sendAutomatically: boolean;
  rulePatientStatus: RulePatientStatus;
  ruleFrequencyMonths: number | null;
  ruleMinAge: number | null;
  ruleMaxAge: number | null;
  ruleAppointmentTypeIds: string[];
  ruleProcedureCodes: string[];
  isDefault: boolean;
  isLocked: boolean;
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
  position: number;
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

export type BookingFieldType = "text" | "number" | "note" | "single_select" | "multi_select" | "payment";

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
  providerName: string;
  operatoryName: string | null;
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
  reason: "missed" | "cancelled" | "asap" | "continuing_care";
  appointmentAt: string | null;
  recallType?: string | null;
  recallDueDate?: string | null;
  appointmentNotes?: string | null;
};

export type WaitlistEntry = {
  id: string;
  patientId: string;
  patientName: string;
  providerName: string;
  appointmentType: string;
  notes: string;
  status: string;
  createdAt: string;
};

export type AsapEntry = {
  id: string;
  patientId: string;
  patientName: string;
  providerName: string;
  appointmentType: string;
  startsAt: string;
  durationMinutes: number;
  notes: string;
  createdAt: string;
};

// ── Public patient forms portal (unauthenticated) ──────────────────────────────

export type PublicBranding = {
  practiceName: string;
  practiceLogoUrl: string | null;
  locationName: string;
  locationAddress: string;
  locationPhone: string;
};

export type PublicFormField = {
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
  labelPosition?: FormFieldLabelPosition;
  syncTarget?: string | null;
  placeholder?: string;
  defaultValue?: string;
  width?: FormFieldWidth;
};

export type PublicForm = {
  requestId: string;
  templateId: string;
  name: string;
  displayType: FormDisplayType;
  pageCount: number;
  fields: PublicFormField[];
  completed: boolean;
  expiresAt: string;
  medicalAlerts: MedicalAlertCatalog | null;
  prefillAnswers: Record<string, unknown>;
};

export type PublicVerifyResult = PublicBranding & {
  patientName: string;
  forms: PublicForm[];
};

// ── Public packet links (unauthenticated, no known patient) ────────────────────

export type PublicPacketForm = {
  templateId: string;
  name: string;
  displayType: FormDisplayType;
  pageCount: number;
  fields: PublicFormField[];
  medicalAlerts: MedicalAlertCatalog | null;
};

export type PublicPacketInfo = PublicBranding & {
  packetName: string;
  forms: PublicPacketForm[];
};

// ── Staff-side: pending public packet submissions (Assign & sync) ──────────────

export type PublicPacketSubmission = {
  id: string;
  formPacketId: string;
  packetName: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  phone: string;
  email: string;
  formNames: string[];
  createdAt: string;
};

// ── Communications / Templates ─────────────────────────────────────────────────

export type TemplateCategory =
  | "appointment_journey"
  | "daily"
  | "post_appointment"
  | "patient_based"
  | "manual";

export type TemplateStepKind = "trigger" | "email" | "sms" | "condition";

export type CommunicationTemplateStep = {
  id: string;
  kind: TemplateStepKind;
  title: string;
  subtitle: string;
  body: string;
  subject: string;
  timingValue: number | null;
  timingUnit: string | null;
  conditionLabel: string | null;
  position: number;
};

export type CommunicationTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: TemplateCategory;
  isActive: boolean;
  totalSent: number;
  recipients: number;
  multiLocation: boolean;
  appointmentTypeId: string | null;
  appointmentTypeName: string;
  locationName: string;
  createdAt: string;
  updatedAt: string;
  steps: CommunicationTemplateStep[];
};

export type TemplateConfiguration = {
  id: string;
  locationId: string;
  sendingHoursStart: string;
  sendingHoursEnd: string;
  customizeByAppointmentType: boolean;
  updatedAt: string;
};

export type TemplateAppointmentTypeStatus = {
  appointmentTypeId: string;
  appointmentTypeName: string;
  enabled: boolean;
  variantId: string | null;
};