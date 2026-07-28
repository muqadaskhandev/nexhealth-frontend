import { api } from "./api";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AvailabilityBlock,
  AvailabilitySlot,
  BookingFieldType,
  BookingFormField,
  BookingInsurance,
  CommunicationTemplate,
  CommunicationTemplateStep,
  FormDisplayType,
  FormField,
  FormFieldType,
  FormPacket,
  FormRequestBatch,
  FormRequestBatchStatus,
  FormRequestCompletedStatus,
  FormSubmission,
  FormTemplate,
  FormTemplateSource,
  FormTemplateStatus,
  InsertionRule,
  MappingCondition,
  MappingRule,
  AsapEntry,
  MedicalAlert,
  Operatory,
  Patient,
  PatientTypeRule,
  Provider,
  ProviderStatus,
  PublicPacketSubmission,
  RepeatMode,
  RulePatientStatus,
  TemplateCategory,
  TemplateConfiguration,
  TemplateAppointmentTypeStatus,
  TemplateStepKind,
  WaitlistEntry,
  WaitlistPatientCandidate,
  WaitlistRequest,
  WaitlistRequestPatient,
  WaitlistRequestSlot,
  WaitlistRequestStatus,
} from "../types";

// ── API types (snake_case from backend) ─────────────────────────────────────
export type ApiPatient = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  gender: string;
  email: string;
  phone: string;
  address: string;
  language: string;
  provider_name: string;
  synced: boolean;
  archived: boolean;
  insurance_data: Record<string, unknown>;
  notification_prefs: Record<string, unknown>;
  initials: string;
  full_name: string;
};

export type ApiAppointment = {
  id: string;
  patient_id: string;
  provider_name: string;
  appointment_type: string;
  starts_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  insurance_status: "pending" | "verified";
  forms_status: "complete" | "incomplete";
  patient_name: string;
  patient_initials: string;
  patient_dob: string | null;
  patient_email: string;
  patient_phone: string;
};

export type ApiCommunicationTemplateStep = {
  id: string;
  kind: TemplateStepKind;
  title: string;
  subtitle: string;
  body: string;
  subject: string;
  timing_value: number | null;
  timing_unit: string | null;
  condition_label: string | null;
  position: number;
  meta?: Record<string, unknown>;
};

export type ApiCommunicationTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: TemplateCategory;
  is_active: boolean;
  total_sent: number;
  recipients: number;
  multi_location: boolean;
  appointment_type_id: string | null;
  appointment_type_name: string;
  location_name: string;
  created_at: string;
  updated_at: string;
  steps: ApiCommunicationTemplateStep[];
};

export type ApiTemplateConfiguration = {
  id: string;
  location_id: string;
  sending_hours_start: string;
  sending_hours_end: string;
  customize_by_appointment_type: boolean;
  family_messaging_enabled: boolean;
  use_family_messaging_for_reminders: boolean;
  family_messaging_age_limit: number | null;
  updated_at: string;
};

export type ApiTemplateAppointmentTypeStatus = {
  appointment_type_id: string;
  appointment_type_name: string;
  enabled: boolean;
  variant_id: string | null;
};
export function mapCommunicationTemplateStep(s: ApiCommunicationTemplateStep): CommunicationTemplateStep {
  return {
    id: s.id,
    kind: s.kind,
    title: s.title,
    subtitle: s.subtitle || "",
    body: s.body || "",
    subject: s.subject || "",
    timingValue: s.timing_value,
    timingUnit: s.timing_unit,
    conditionLabel: s.condition_label,
    position: s.position,
  };
}

export function mapCommunicationTemplate(t: ApiCommunicationTemplate): CommunicationTemplate {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description || "",
    category: t.category,
    isActive: t.is_active,
    totalSent: t.total_sent,
    recipients: t.recipients,
    multiLocation: t.multi_location,
    appointmentTypeId: t.appointment_type_id,
    appointmentTypeName: t.appointment_type_name || "",
    locationName: t.location_name || "",
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    steps: (t.steps || []).map(mapCommunicationTemplateStep),
  };
}

export function mapTemplateConfiguration(c: ApiTemplateConfiguration): TemplateConfiguration {
  return {
    id: c.id,
    locationId: c.location_id,
    sendingHoursStart: c.sending_hours_start,
    sendingHoursEnd: c.sending_hours_end,
    customizeByAppointmentType: !!c.customize_by_appointment_type,
    familyMessagingEnabled: !!c.family_messaging_enabled,
    useFamilyMessagingForReminders: !!c.use_family_messaging_for_reminders,
    familyMessagingAgeLimit:
      c.family_messaging_age_limit == null ? null : c.family_messaging_age_limit,
    updatedAt: c.updated_at,
  };
}

export function mapTemplateAppointmentTypeStatus(
  s: ApiTemplateAppointmentTypeStatus
): TemplateAppointmentTypeStatus {
  return {
    appointmentTypeId: s.appointment_type_id,
    appointmentTypeName: s.appointment_type_name,
    enabled: s.enabled,
    variantId: s.variant_id,
  };
}

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function formatDob(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/**
 * Parses a "MM/DD/YYYY" (or already-ISO "YYYY-MM-DD") input into an ISO date string.
 * Falls back to "DD/MM/YYYY" when the MM/DD reading isn't a valid calendar date
 * (e.g. "27/08/1994"), since that's a common way for this field to get filled in.
 */
export function parseDob(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slash) {
    const [, a, b, yearStr] = slash;
    const year = Number(yearStr);
    for (const [month, day] of [[Number(a), Number(b)], [Number(b), Number(a)]]) {
      if (isValidCalendarDate(year, month, day)) {
        return `${yearStr}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
    return undefined;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function mapPatient(p: ApiPatient): Patient {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    preferredName: p.preferred_name ?? undefined,
    dob: formatDob(p.dob),
    gender: p.gender,
    email: p.email,
    phone: p.phone,
    address: p.address || undefined,
    provider: p.provider_name,
    language: p.language,
    initials: p.initials,
    synced: p.synced,
    archived: p.archived,
    insuranceData: p.insurance_data as Patient["insuranceData"],
    notificationPrefs: Object.keys(p.notification_prefs || {}).length
      ? (p.notification_prefs as Patient["notificationPrefs"])
      : undefined,
  };
}

export function mapAppointment(a: ApiAppointment): Appointment {
  return {
    id: a.id,
    patientId: a.patient_id,
    startsAt: a.starts_at,
    time: formatTime(a.starts_at),
    duration: `${a.duration_minutes} minutes`,
    status: a.status,
    patient: {
      name: a.patient_name,
      dob: formatDob(a.patient_dob),
      initials: a.patient_initials,
      color: avatarColor(a.patient_id),
    },
    contact: { phone: a.patient_phone, email: a.patient_email },
    details: { provider: a.provider_name, type: a.appointment_type },
    insurance: a.insurance_status,
    forms: a.forms_status,
  };
}

export type ApiFormSubmission = {
  id: string;
  patient_id: string;
  form_name: string;
  device: string;
  sync_status: string;
  submitted_at: string;
  patient_name: string;
  patient_initials: string;
};

export function mapFormSubmission(s: ApiFormSubmission): FormSubmission {
  return {
    id: s.id,
    patient: s.patient_name,
    initials: s.patient_initials,
    submitted: new Date(s.submitted_at).toLocaleString(),
    device: s.device,
    expiration: "—",
    formName: s.form_name,
    completedStatus: "Complete",
    syncStatus: s.sync_status === "complete" ? "complete" : "sync-now",
  };
}

export type ApiMedicalAlert = {
  id: string;
  category: "condition" | "allergy" | "medication";
  label: string;
  active: boolean;
  flash: boolean;
  sort_order: number;
  snomed_code: string | null;
};

export function mapMedicalAlert(a: ApiMedicalAlert): MedicalAlert {
  return {
    id: a.id,
    category: a.category,
    label: a.label,
    active: a.active,
    flash: a.flash,
    sortOrder: a.sort_order,
    snomedCode: a.snomed_code,
  };
}

export type ApiFormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options: string[];
  page: number;
  min_length: number | null;
  max_length: number | null;
  conditional_field_id: string | null;
  conditional_value: string;
  label_position?: FormFieldLabelPosition;
  sync_target?: string | null;
  placeholder?: string;
  default_value?: string;
  width?: FormFieldWidth;
};

export type ApiFormTemplate = {
  id: string;
  name: string;
  form_type: string;
  source: FormTemplateSource;
  status: FormTemplateStatus;
  display_type: FormDisplayType;
  fields: ApiFormField[];
  page_count: number;
  uploaded_file_url: string | null;
  digitize_notes: string;
  archived_at: string | null;
  send_automatically: boolean;
  rule_patient_status: RulePatientStatus;
  rule_frequency_months: number | null;
  rule_min_age: number | null;
  rule_max_age: number | null;
  rule_appointment_type_ids: string[];
  rule_procedure_codes: string[];
  is_default: boolean;
  is_locked: boolean;
  created_at: string;
};

export function mapFormTemplate(t: ApiFormTemplate): FormTemplate {
  return {
    id: t.id,
    name: t.name,
    documentType: t.form_type,
    source: t.source,
    status: t.status,
    displayType: t.display_type,
    fields: t.fields.map((f): FormField => ({
      id: f.id,
      type: f.type,
      label: f.label,
      required: f.required,
      options: f.options,
      page: f.page,
      minLength: f.min_length,
      maxLength: f.max_length,
      conditionalFieldId: f.conditional_field_id,
      conditionalValue: f.conditional_value,
      labelPosition: f.label_position ?? "top",
      syncTarget: f.sync_target ?? null,
      placeholder: f.placeholder ?? "",
      defaultValue: f.default_value ?? "",
      width: f.width ?? "full",
    })),
    pageCount: t.page_count,
    uploadedFileUrl: t.uploaded_file_url,
    digitizeNotes: t.digitize_notes,
    archivedAt: t.archived_at,
    sendAutomatically: t.send_automatically,
    rulePatientStatus: t.rule_patient_status,
    ruleFrequencyMonths: t.rule_frequency_months,
    ruleMinAge: t.rule_min_age,
    ruleMaxAge: t.rule_max_age,
    ruleAppointmentTypeIds: t.rule_appointment_type_ids,
    ruleProcedureCodes: t.rule_procedure_codes ?? [],
    isDefault: t.is_default,
    isLocked: t.is_locked,
    createdAt: t.created_at,
  };
}

export type ApiFormPacket = {
  id: string;
  name: string;
  form_template_ids: string[];
  public_code: string | null;
  created_at: string;
};

export function mapFormPacket(p: ApiFormPacket): FormPacket {
  return {
    id: p.id,
    name: p.name,
    formTemplateIds: p.form_template_ids,
    publicCode: p.public_code,
    createdAt: p.created_at,
  };
}

export type ApiPublicPacketSubmission = {
  id: string;
  form_packet_id: string;
  packet_name: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  phone: string;
  email: string;
  form_names: string[];
  created_at: string;
};

export function mapPublicPacketSubmission(s: ApiPublicPacketSubmission): PublicPacketSubmission {
  return {
    id: s.id,
    formPacketId: s.form_packet_id,
    packetName: s.packet_name,
    firstName: s.first_name,
    lastName: s.last_name,
    dob: s.dob,
    phone: s.phone,
    email: s.email,
    formNames: s.form_names,
    createdAt: s.created_at,
  };
}

export type ApiFormRequestBatch = {
  patient_id: string;
  patient_name: string;
  patient_initials: string;
  request_ids: string[];
  sent_at: string;
  expires_at: string;
  forms: { id: string; name: string }[];
  status: FormRequestBatchStatus;
  completed_status: FormRequestCompletedStatus;
  sync_status: "sync-now" | "sync-failed" | null;
};

export function mapFormRequestBatch(b: ApiFormRequestBatch): FormRequestBatch {
  return {
    patientId: b.patient_id,
    patientName: b.patient_name,
    patientInitials: b.patient_initials,
    requestIds: b.request_ids,
    sentAt: b.sent_at,
    expiresAt: b.expires_at,
    forms: b.forms,
    status: b.status,
    completedStatus: b.completed_status,
    syncStatus: b.sync_status,
  };
}

export type ApiFormSubmissionDetail = {
  form_name: string;
  answers: Record<string, unknown>;
  submitted_at: string;
};

export type ApiInsertionRule = { id: string; code_type: string; codes: string[] };

export type ApiAppointmentType = {
  id: string;
  name: string;
  duration_minutes: number;
  available_online: boolean;
  patient_type: PatientTypeRule;
  allow_patient_cancel: boolean;
  position: number;
  insertion_rules: ApiInsertionRule[];
  created_at: string;
};

export function mapAppointmentType(t: ApiAppointmentType): AppointmentType {
  return {
    id: t.id,
    name: t.name,
    durationMinutes: t.duration_minutes,
    availableOnline: t.available_online,
    patientType: t.patient_type,
    allowPatientCancel: t.allow_patient_cancel,
    position: t.position,
    insertionRules: t.insertion_rules.map((r) => ({ id: r.id, codeType: r.code_type, codes: r.codes })),
  };
}

export type ApiMappingRule = {
  id: string;
  target_appointment_type_id: string;
  conditions: MappingCondition[];
  position: number;
  created_at: string;
};

export function mapMappingRule(r: ApiMappingRule): MappingRule {
  return {
    id: r.id,
    targetAppointmentTypeId: r.target_appointment_type_id,
    conditions: r.conditions,
    position: r.position,
  };
}

export type ApiProvider = {
  id: string;
  name: string;
  role: string;
  status: ProviderStatus;
  default_appointment_type_ids: string[];
  default_insurances: string[];
  appointment_type_durations: Record<string, number>;
  avatar_url: string | null;
  created_at: string;
};

export function mapProvider(p: ApiProvider): Provider {
  return {
    id: p.id,
    name: p.name,
    role: p.role,
    status: p.status,
    defaultAppointmentTypeIds: p.default_appointment_type_ids,
    defaultInsurances: p.default_insurances,
    appointmentTypeDurations: p.appointment_type_durations,
    avatarUrl: p.avatar_url,
  };
}

export type ApiOperatory = { id: string; name: string; active: boolean; created_at: string };

export function mapOperatory(o: ApiOperatory): Operatory {
  return { id: o.id, name: o.name, active: o.active };
}

export type ApiAvailabilitySlot = {
  id: string;
  provider_id: string;
  operatory_id: string | null;
  repeat_mode: RepeatMode;
  specific_date: string | null;
  day_of_week: number | null;
  starts_on: string | null;
  start_time: string;
  end_time: string;
  use_provider_defaults: boolean;
  appointment_type_ids: string[];
  created_at: string;
};

export function mapAvailabilitySlot(s: ApiAvailabilitySlot): AvailabilitySlot {
  return {
    id: s.id,
    providerId: s.provider_id,
    operatoryId: s.operatory_id,
    repeatMode: s.repeat_mode,
    specificDate: s.specific_date,
    dayOfWeek: s.day_of_week,
    startsOn: s.starts_on,
    startTime: s.start_time,
    endTime: s.end_time,
    useProviderDefaults: s.use_provider_defaults,
    appointmentTypeIds: s.appointment_type_ids,
  };
}

export type ApiAvailabilityBlock = {
  id: string;
  provider_id: string;
  operatory_id: string | null;
  starts_at: string;
  ends_at: string;
  notes: string;
  created_at: string;
};

export function mapAvailabilityBlock(b: ApiAvailabilityBlock): AvailabilityBlock {
  return {
    id: b.id,
    providerId: b.provider_id,
    operatoryId: b.operatory_id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    notes: b.notes,
  };
}

export type ApiBookingFormField = {
  id: string;
  field_type: BookingFieldType;
  label: string;
  show_to: PatientTypeRule;
  required: boolean;
  note_text: string;
  options: string[];
  position: number;
  created_at: string;
};

export function mapBookingFormField(f: ApiBookingFormField): BookingFormField {
  return {
    id: f.id,
    fieldType: f.field_type,
    label: f.label,
    showTo: f.show_to,
    required: f.required,
    noteText: f.note_text,
    options: f.options,
    position: f.position,
  };
}

export type ApiBookingInsurance = { id: string; name: string; created_at: string };

export function mapBookingInsurance(i: ApiBookingInsurance): BookingInsurance {
  return { id: i.id, name: i.name };
}

export type ApiWaitlistRequestSlot = {
  id: string;
  provider_id: string;
  operatory_id: string | null;
  provider_name?: string;
  operatory_name?: string | null;
  starts_at: string;
  ends_at: string;
  claimed_by_patient_id: string | null;
  claimed_at: string | null;
  created_appointment_id: string | null;
  cancelled_at: string | null;
};

export function mapWaitlistRequestSlot(s: ApiWaitlistRequestSlot): WaitlistRequestSlot {
  return {
    id: s.id,
    providerId: s.provider_id,
    operatoryId: s.operatory_id,
    providerName: s.provider_name ?? "",
    operatoryName: s.operatory_name ?? null,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    claimedByPatientId: s.claimed_by_patient_id,
    claimedAt: s.claimed_at,
    createdAppointmentId: s.created_appointment_id,
    cancelledAt: s.cancelled_at,
  };
}

export type ApiWaitlistRequestPatient = {
  id: string;
  patient_id: string;
  name: string;
  notified_at: string | null;
};

export function mapWaitlistRequestPatient(p: ApiWaitlistRequestPatient): WaitlistRequestPatient {
  return { id: p.id, patientId: p.patient_id, name: p.name, notifiedAt: p.notified_at };
}

export type ApiWaitlistRequest = {
  id: string;
  status: WaitlistRequestStatus;
  created_at: string;
  sent_at: string;
  slots: ApiWaitlistRequestSlot[];
  patients: ApiWaitlistRequestPatient[];
};

export function mapWaitlistRequest(r: ApiWaitlistRequest): WaitlistRequest {
  return {
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    sentAt: r.sent_at,
    slots: r.slots.map(mapWaitlistRequestSlot),
    patients: r.patients.map(mapWaitlistRequestPatient),
  };
}

export type ApiWaitlistPatientCandidate = {
  id: string;
  name: string;
  reason: string;
  appointment_at: string | null;
  recall_type?: string | null;
  recall_due_date?: string | null;
  appointment_notes?: string | null;
};

export function mapWaitlistPatientCandidate(c: ApiWaitlistPatientCandidate): WaitlistPatientCandidate {
  return {
    id: c.id,
    name: c.name,
    reason: c.reason as WaitlistPatientCandidate["reason"],
    appointmentAt: c.appointment_at,
    recallType: c.recall_type,
    recallDueDate: c.recall_due_date,
    appointmentNotes: c.appointment_notes,
  };
}

export type ApiWaitlistEntry = {
  id: string;
  patient_id: string;
  provider_name: string;
  appointment_type: string;
  notes: string;
  status: string;
  patient_name: string;
  created_at: string;
};

export function mapWaitlistEntry(e: ApiWaitlistEntry): WaitlistEntry {
  return {
    id: e.id,
    patientId: e.patient_id,
    patientName: e.patient_name,
    providerName: e.provider_name,
    appointmentType: e.appointment_type,
    notes: e.notes,
    status: e.status,
    createdAt: e.created_at,
  };
}

export type ApiAsapEntry = {
  id: string;
  patient_id: string;
  patient_name: string;
  provider_name: string;
  appointment_type: string;
  starts_at: string;
  duration_minutes: number;
  notes: string;
  created_at: string;
};

export function mapAsapEntry(e: ApiAsapEntry): AsapEntry {
  return {
    id: e.id,
    patientId: e.patient_id,
    patientName: e.patient_name,
    providerName: e.provider_name,
    appointmentType: e.appointment_type,
    startsAt: e.starts_at,
    durationMinutes: e.duration_minutes,
    notes: e.notes,
    createdAt: e.created_at,
  };
}

export const staffApi = {
  patients: {
    list: (q = "", archived = false, allLocations = false) =>
      api.get<ApiPatient[]>(
        `/api/patients?q=${encodeURIComponent(q)}&archived=${archived}&all_locations=${allLocations}`
      ),
    get: (id: string) => api.get<ApiPatient>(`/api/patients/${id}`),
    create: (body: Record<string, unknown>) => api.post<ApiPatient>("/api/patients", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiPatient>(`/api/patients/${id}`, body),
    activity: (id: string) =>
      api.get<{ id: string; activity_type: string; title: string; body: string; created_at: string }[]>(
        `/api/patients/${id}/activity`
      ),
    verifyInsurance: (patientId: string) =>
      api.post<ApiPatient>("/api/insurance/verify", { patient_id: patientId }),
    duplicates: () => api.get<ApiPatient[][]>("/api/patients/duplicates"),
  },
  appointments: {
    list: (opts?: { date?: string; startDate?: string; endDate?: string; patientId?: string }) => {
      const params = new URLSearchParams();
      if (opts?.patientId) params.set("patient_id", opts.patientId);
      else if (opts?.startDate || opts?.endDate) {
        if (opts.startDate) params.set("start_date", opts.startDate);
        if (opts.endDate) params.set("end_date", opts.endDate);
      } else if (opts?.date) {
        params.set("date", opts.date);
      }
      const qs = params.toString();
      return api.get<ApiAppointment[]>(`/api/appointments${qs ? `?${qs}` : ""}`);
    },
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiAppointment>(`/api/appointments/${id}`, body),
  },
  waitlist: {
    list: () => api.get<ApiWaitlistEntry[]>("/api/waitlist"),
    add: (body: {
      patient_id: string;
      provider_name?: string;
      appointment_type?: string;
      notes?: string;
    }) => api.post<ApiWaitlistEntry>("/api/waitlist", body),
    remove: (id: string) => api.delete(`/api/waitlist/${id}`),
  },
  asapList: {
    list: () => api.get<ApiAsapEntry[]>("/api/asap-list"),
    add: (body: {
      patient_id: string;
      appointment_id?: string;
      provider_name?: string;
      appointment_type?: string;
      appointment_type_id?: string;
      starts_at?: string;
      duration_minutes?: number;
      notes?: string;
    }) => api.post<ApiAsapEntry>("/api/asap-list", body),
    remove: (appointmentId: string) => api.delete(`/api/asap-list/${appointmentId}`),
  },
  forms: {
    templates: (archived = false) => api.get<ApiFormTemplate[]>(`/api/forms/templates?archived=${archived}`),
    createTemplate: (body: Record<string, unknown>) =>
      api.post<ApiFormTemplate>("/api/forms/templates", body),
    updateTemplate: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiFormTemplate>(`/api/forms/templates/${id}`, body),
    digitizeTemplate: async (file: File, name: string, notes: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name);
      form.append("notes", notes);
      const res = await fetch("/api/forms/templates/digitize", {
        method: "POST",
        body: form,
        credentials: "include",
        headers: {
          "X-CSRF-Token":
            document.cookie
              .split("; ")
              .find((c) => c.startsWith("csrf_token="))
              ?.split("=")
              .slice(1)
              .join("=") || "",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw err;
      }
      return (await res.json()) as ApiFormTemplate;
    },
    duplicateTemplate: (id: string) => api.post<ApiFormTemplate>(`/api/forms/templates/${id}/duplicate`),
    copyTemplates: (templateIds: string[], locationIds: string[], packetIds: string[] = []) =>
      api.post<{ copied: number; forms_copied: number; packets_copied: number }>("/api/forms/templates/copy", {
        template_ids: templateIds,
        packet_ids: packetIds,
        location_ids: locationIds,
      }),
    archiveTemplate: (id: string) => api.post<ApiFormTemplate>(`/api/forms/templates/${id}/archive`),
    unarchiveTemplate: (id: string) => api.post<ApiFormTemplate>(`/api/forms/templates/${id}/unarchive`),
    setDefaultTemplate: (id: string) => api.post<ApiFormTemplate>(`/api/forms/templates/${id}/set-default`),
    frequentTemplates: () => api.get<ApiFormTemplate[]>("/api/forms/templates/frequent"),
    submissions: () => api.get<ApiFormSubmission[]>("/api/forms/submissions"),
    send: (params: {
      patientId: string;
      formTemplateIds: string[];
      expiresAt?: string;
      message?: string;
      emailNote?: string;
    }) =>
      api.post<{ message: string; count: number }>("/api/forms/send", {
        patient_id: params.patientId,
        form_template_ids: params.formTemplateIds,
        expires_at: params.expiresAt,
        message: params.message,
        email_note: params.emailNote,
      }),
    packets: {
      list: () => api.get<ApiFormPacket[]>("/api/forms/packets"),
      create: (body: { name: string; form_template_ids: string[] }) =>
        api.post<ApiFormPacket>("/api/forms/packets", body),
      update: (id: string, body: { name: string; form_template_ids: string[] }) =>
        api.patch<ApiFormPacket>(`/api/forms/packets/${id}`, body),
      delete: (id: string) => api.delete(`/api/forms/packets/${id}`),
      duplicate: (id: string) => api.post<ApiFormPacket>(`/api/forms/packets/${id}/duplicate`),
      publicAccess: (id: string) => api.post<ApiFormPacket>(`/api/forms/packets/${id}/public-access`),
    },
    publicSubmissions: {
      list: () => api.get<ApiPublicPacketSubmission[]>("/api/forms/public-submissions"),
      assign: (id: string, patientId: string) =>
        api.post<{ message: string }>(`/api/forms/public-submissions/${id}/assign`, { patient_id: patientId }),
    },
    requests: {
      list: (tab: "active" | "expired" | "synced" | "deleted" | "all" = "all") =>
        api.get<ApiFormRequestBatch[]>(`/api/forms/requests?tab=${tab}`),
      reactivate: (requestIds: string[], expiresAt: string) =>
        api.post<{ message: string }>("/api/forms/requests/reactivate", {
          request_ids: requestIds,
          expires_at: expiresAt,
        }),
      archive: (requestIds: string[]) =>
        api.post<{ message: string }>("/api/forms/requests/archive", {
          request_ids: requestIds,
        }),
      sync: (requestIds: string[]) =>
        api.post<{ message: string }>("/api/forms/requests/sync", {
          request_ids: requestIds,
        }),
      markSynced: (requestIds: string[]) =>
        api.post<{ message: string }>("/api/forms/requests/mark-synced", {
          request_ids: requestIds,
        }),
      submissions: (requestIds: string[]) =>
        api.get<ApiFormSubmissionDetail[]>(
          `/api/forms/requests/submissions?${requestIds.map((id) => `request_ids=${id}`).join("&")}`
        ),
    },
  },
  messages: {
    list: (
      patientId?: string,
      opts?: boolean | {
        includeArchived?: boolean;
        archivedOnly?: boolean;
        unreadOnly?: boolean;
      }
    ) => {
      const options =
        typeof opts === "boolean" ? { includeArchived: opts } : opts || {};
      const qs = new URLSearchParams();
      if (patientId) qs.set("patient_id", patientId);
      if (options.includeArchived) qs.set("include_archived", "true");
      if (options.archivedOnly) qs.set("archived_only", "true");
      if (options.unreadOnly) qs.set("unread_only", "true");
      const q = qs.toString();
      return api.get<
        {
          id: string;
          thread_id: string;
          body: string;
          direction: string;
          channel: string;
          sent_at: string;
          patient_id: string | null;
          patient_name: string;
          patient_first_name: string;
          patient_last_name: string;
          patient_phone: string;
          delivery_status: string;
          failure_reason: string | null;
          attachment_name: string | null;
          thread_unread: boolean;
          thread_archived: boolean;
        }[]
      >(`/api/messages${q ? `?${q}` : ""}`);
    },
    send: (
      patientId: string,
      body: string,
      channel = "sms",
      attachmentName?: string | null
    ) =>
      api.post("/api/messages", {
        patient_id: patientId,
        body,
        channel,
        attachment_name: attachmentName || null,
      }),
    updateThread: (threadId: string, body: { unread?: boolean; archived?: boolean }) =>
      api.patch<{ id: string; patient_id: string; unread: boolean; archived: boolean }>(
        `/api/message-threads/${threadId}`,
        body
      ),
  },
  savedResponses: {
    list: (q?: string) =>
      api.get<
        {
          id: string;
          location_id: string;
          title: string;
          body: string;
          shared_location_ids: string[];
          created_at: string;
          updated_at: string;
        }[]
      >(`/api/saved-responses${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (body: {
      title: string;
      body?: string;
      shared_location_ids?: string[];
    }) =>
      api.post<{
        id: string;
        location_id: string;
        title: string;
        body: string;
        shared_location_ids: string[];
        created_at: string;
        updated_at: string;
      }>("/api/saved-responses", body),
    update: (
      id: string,
      body: {
        title?: string;
        body?: string;
        shared_location_ids?: string[];
      }
    ) =>
      api.patch<{
        id: string;
        location_id: string;
        title: string;
        body: string;
        shared_location_ids: string[];
        created_at: string;
        updated_at: string;
      }>(`/api/saved-responses/${id}`, body),
    remove: (id: string) => api.delete(`/api/saved-responses/${id}`),
  },
  communicationTemplates: {
    list: (scope: "default" | "variants" | "all" = "default") =>
      api.get<ApiCommunicationTemplate[]>(`/api/communication-templates?scope=${scope}`),
    get: (id: string) => api.get<ApiCommunicationTemplate>(`/api/communication-templates/${id}`),
    bySlug: (slug: string) =>
      api.get<ApiCommunicationTemplate>(`/api/communication-templates/by-slug/${slug}`),
    appointmentTypes: (slug: string) =>
      api.get<ApiTemplateAppointmentTypeStatus[]>(
        `/api/communication-templates/by-slug/${slug}/appointment-types`
      ),
    setVariant: (slug: string, appointmentTypeId: string, enabled: boolean) =>
      api.post<ApiCommunicationTemplate | null>(
        `/api/communication-templates/by-slug/${slug}/variants`,
        { appointment_type_id: appointmentTypeId, enabled }
      ),
    update: (id: string, body: { is_active?: boolean; description?: string }) =>
      api.patch<ApiCommunicationTemplate>(`/api/communication-templates/${id}`, body),
    updateStep: (
      templateId: string,
      stepId: string,
      body: Record<string, unknown>
    ) =>
      api.patch<ApiCommunicationTemplateStep>(
        `/api/communication-templates/${templateId}/steps/${stepId}`,
        body
      ),
    addStep: (templateId: string, body: { kind: string; title: string; body?: string; subject?: string }) =>
      api.post<ApiCommunicationTemplateStep>(`/api/communication-templates/${templateId}/steps`, body),
    deleteStep: (templateId: string, stepId: string) =>
      api.delete(`/api/communication-templates/${templateId}/steps/${stepId}`),
    history: (
      templateId: string,
      params?: { q?: string; sent_from?: string; sent_to?: string }
    ) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set("q", params.q);
      if (params?.sent_from) qs.set("sent_from", params.sent_from);
      if (params?.sent_to) qs.set("sent_to", params.sent_to);
      const q = qs.toString();
      return api.get<
        {
          id: string;
          template_id: string;
          patient_id: string | null;
          patient_name: string;
          patient_dob: string | null;
          communication_label: string;
          channel: string;
          sent_at: string;
          provider_name: string;
          appointment_at: string | null;
        }[]
      >(`/api/communication-templates/${templateId}/history${q ? `?${q}` : ""}`);
    },
  },
  templateConfig: {
    get: () => api.get<ApiTemplateConfiguration>("/api/template-configurations"),
    update: (body: {
      sending_hours_start?: string;
      sending_hours_end?: string;
      customize_by_appointment_type?: boolean;
      family_messaging_enabled?: boolean;
      use_family_messaging_for_reminders?: boolean;
      family_messaging_age_limit?: number | null;
    }) => api.patch<ApiTemplateConfiguration>("/api/template-configurations", body),
  },
  messageGrouping: {
    rules: () =>
      api.get<{
        title: string;
        summary: string;
        consolidation_gate: string;
        sections: {
          id: string;
          title: string;
          intro?: string;
          items: {
            title: string;
            body: string;
            callout?: string;
            example?: string;
          }[];
        }[];
      }>("/api/message-grouping/rules"),
    preview: (body: {
      template_content?: string;
      family_messaging_enabled?: boolean;
      use_family_messaging_for_reminders?: boolean;
      appointment_journeys_enabled?: boolean;
      date?: string;
      on_date?: string;
      appointments?: {
        patient_id: string;
        patient_name: string;
        patient_phone?: string;
        guarantor_phone?: string | null;
        starts_at: string;
        duration_minutes?: number;
        appointment_type?: string;
        journey_key?: string | null;
      }[];
    }) => {
      const { date, on_date, ...rest } = body;
      return api.post<{
        consolidation_supported: boolean;
        family_messaging_active: boolean;
        groups: {
          mode: string;
          recipient_phone: string;
          recipient_label: string;
          appointment_ids: string[];
          listed_appointment_ids: string[];
          patient_names: string[];
          notes: string[];
          confirm_applies_to_all: boolean;
        }[];
      }>("/api/message-grouping/preview", {
        ...rest,
        on_date: on_date ?? date,
      });
    },
  },
  payments: {
    list: () =>
      api.get<
        {
          id: string;
          patient_name: string;
          amount: string;
          description: string;
          status: string;
          created_at: string;
        }[]
      >("/api/payments"),
    create: (patientId: string, amount: number, description: string) =>
      api.post("/api/payments", {
        patient_id: patientId,
        amount,
        description,
      }),
  },
  dashboard: (opts?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (opts?.startDate) params.set("start_date", opts.startDate);
    if (opts?.endDate) params.set("end_date", opts.endDate);
    const qs = params.toString();
    return api.get<{
      appointments_today: number;
      confirmed_count: number;
      unconfirmed_count: number;
      waitlist_count: number;
      pending_forms: number;
      pending_payments: number;
    }>(`/api/dashboard/stats${qs ? `?${qs}` : ""}`);
  },
  activity: (limit = 75) =>
    api.get<
      {
        id: string;
        patient_id: string;
        patient_name: string;
        activity_type: string;
        title: string;
        body: string;
        created_at: string;
      }[]
    >(`/api/activity?limit=${limit}`),
  medicalAlerts: {
    list: () => api.get<ApiMedicalAlert[]>("/api/medical-alerts"),
    create: (body: { category: string; label: string; flash?: boolean; snomed_code?: string | null }) =>
      api.post<ApiMedicalAlert>("/api/medical-alerts", body),
    update: (id: string, body: { label?: string; active?: boolean; flash?: boolean; snomed_code?: string | null }) =>
      api.patch<ApiMedicalAlert>(`/api/medical-alerts/${id}`, body),
    delete: (id: string) => api.delete(`/api/medical-alerts/${id}`),
    move: (id: string, direction: "up" | "down") =>
      api.post<{ message: string }>(`/api/medical-alerts/${id}/move`, { direction }),
  },
  appointmentTypes: {
    list: (locationId?: string) =>
      api.get<ApiAppointmentType[]>(
        locationId ? `/api/appointment-types?location_id=${encodeURIComponent(locationId)}` : "/api/appointment-types"
      ),
    create: (body: Record<string, unknown>) =>
      api.post<ApiAppointmentType>("/api/appointment-types", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiAppointmentType>(`/api/appointment-types/${id}`, body),
    delete: (id: string) => api.delete(`/api/appointment-types/${id}`),
    reorder: (orderedIds: string[]) =>
      api.post<ApiAppointmentType[]>("/api/appointment-types/reorder", { ordered_ids: orderedIds }),
    copy: (appointmentTypeIds: string[], locationIds: string[]) =>
      api.post<{ copied: number }>("/api/appointment-types/copy", {
        appointment_type_ids: appointmentTypeIds,
        location_ids: locationIds,
      }),
    bulkPatientType: (locationId: string, updates: { id: string; patient_type: string }[]) =>
      api.post<{ updated: number }>("/api/appointment-types/bulk-patient-type", {
        location_id: locationId,
        updates,
      }),
  },
  mappingRules: {
    list: () => api.get<ApiMappingRule[]>("/api/mapping-rules"),
    create: (body: Record<string, unknown>) => api.post<ApiMappingRule>("/api/mapping-rules", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiMappingRule>(`/api/mapping-rules/${id}`, body),
    delete: (id: string) => api.delete(`/api/mapping-rules/${id}`),
    reorder: (orderedIds: string[]) =>
      api.post<ApiMappingRule[]>("/api/mapping-rules/reorder", { ordered_ids: orderedIds }),
    retag: () => api.post<{ updated: number }>("/api/mapping-rules/retag", {}),
    copy: (ruleIds: string[], locationIds: string[]) =>
      api.post<{ copied: number }>("/api/mapping-rules/copy", {
        rule_ids: ruleIds,
        location_ids: locationIds,
      }),
  },
  providers: {
    list: () => api.get<ApiProvider[]>("/api/providers"),
    create: (body: Record<string, unknown>) => api.post<ApiProvider>("/api/providers", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiProvider>(`/api/providers/${id}`, body),
    delete: (id: string) => api.delete(`/api/providers/${id}`),
    uploadAvatar: async (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/providers/${id}/avatar`, {
        method: "POST",
        body: form,
        credentials: "include",
        headers: {
          "X-CSRF-Token":
            document.cookie
              .split("; ")
              .find((c) => c.startsWith("csrf_token="))
              ?.split("=")
              .slice(1)
              .join("=") || "",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw err;
      }
      return (await res.json()) as ApiProvider;
    },
    removeAvatar: (id: string) => api.delete<ApiProvider>(`/api/providers/${id}/avatar`),
  },
  operatories: {
    list: () => api.get<ApiOperatory[]>("/api/operatories"),
    create: (body: Record<string, unknown>) => api.post<ApiOperatory>("/api/operatories", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiOperatory>(`/api/operatories/${id}`, body),
    delete: (id: string) => api.delete(`/api/operatories/${id}`),
  },
  availabilitySlots: {
    list: (providerId?: string) =>
      api.get<ApiAvailabilitySlot[]>(
        `/api/availability-slots${providerId ? `?provider_id=${providerId}` : ""}`
      ),
    create: (body: Record<string, unknown>) =>
      api.post<ApiAvailabilitySlot>("/api/availability-slots", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiAvailabilitySlot>(`/api/availability-slots/${id}`, body),
    delete: (id: string) => api.delete(`/api/availability-slots/${id}`),
    clone: (id: string) => api.post<ApiAvailabilitySlot>(`/api/availability-slots/${id}/clone`),
  },
  availabilityBlocks: {
    list: (providerId?: string) =>
      api.get<ApiAvailabilityBlock[]>(
        `/api/availability-blocks${providerId ? `?provider_id=${providerId}` : ""}`
      ),
    create: (body: Record<string, unknown>) =>
      api.post<ApiAvailabilityBlock>("/api/availability-blocks", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiAvailabilityBlock>(`/api/availability-blocks/${id}`, body),
    delete: (id: string) => api.delete(`/api/availability-blocks/${id}`),
  },
  bookingFormFields: {
    list: () => api.get<ApiBookingFormField[]>("/api/booking-form-fields"),
    create: (body: Record<string, unknown>) =>
      api.post<ApiBookingFormField>("/api/booking-form-fields", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiBookingFormField>(`/api/booking-form-fields/${id}`, body),
    delete: (id: string) => api.delete(`/api/booking-form-fields/${id}`),
    reorder: (orderedIds: string[]) =>
      api.post<ApiBookingFormField[]>("/api/booking-form-fields/reorder", { ordered_ids: orderedIds }),
  },
  bookingInsurances: {
    list: () => api.get<ApiBookingInsurance[]>("/api/booking-insurances"),
    create: (name: string) => api.post<ApiBookingInsurance>("/api/booking-insurances", { name }),
    bulkCreate: (names: string[], copyToAllLocations = false) =>
      api.post<ApiBookingInsurance[]>("/api/booking-insurances/bulk", {
        names,
        copy_to_all_locations: copyToAllLocations,
      }),
    copy: (locationIds: string[]) =>
      api.post<{ copied: number }>("/api/booking-insurances/copy", { location_ids: locationIds }),
    restoreDefaults: () => api.post<ApiBookingInsurance[]>("/api/booking-insurances/restore-defaults"),
    delete: (id: string) => api.delete(`/api/booking-insurances/${id}`),
  },
  waitlistRequests: {
    list: () => api.get<ApiWaitlistRequest[]>("/api/waitlist-requests"),
    get: (id: string) => api.get<ApiWaitlistRequest>(`/api/waitlist-requests/${id}`),
    create: (body: {
      slots: { provider_id: string; operatory_id: string | null; starts_at: string; ends_at: string }[];
      patient_ids: string[];
      template_type?: "asap" | "continuing_care";
    }) => api.post<ApiWaitlistRequest>("/api/waitlist-requests", body),
    cancel: (id: string) => api.post<ApiWaitlistRequest>(`/api/waitlist-requests/${id}/cancel`),
    claimSlot: (requestId: string, slotId: string, patientId: string) =>
      api.post<ApiWaitlistRequest>(`/api/waitlist-requests/${requestId}/slots/${slotId}/claim`, {
        patient_id: patientId,
      }),
    cancelSlot: (requestId: string, slotId: string) =>
      api.post<ApiWaitlistRequest>(`/api/waitlist-requests/${requestId}/slots/${slotId}/cancel`),
    searchMissedCancelled: (params: {
      missed?: boolean;
      cancelled?: boolean;
      startDate?: string;
      endDate?: string;
      excludeRecentDays?: number;
    }) => {
      const qs = new URLSearchParams();
      qs.set("missed", String(params.missed ?? false));
      qs.set("cancelled", String(params.cancelled ?? false));
      if (params.startDate) qs.set("start_date", params.startDate);
      if (params.endDate) qs.set("end_date", params.endDate);
      if (params.excludeRecentDays !== undefined)
        qs.set("exclude_recent_days", String(params.excludeRecentDays));
      return api.get<ApiWaitlistPatientCandidate[]>(
        `/api/waitlist-requests/candidates/missed-cancelled?${qs.toString()}`
      );
    },
    searchAsap: (params: {
      providerId?: string;
      operatoryId?: string;
      appointmentTypeId?: string;
      durationMinutes?: number;
      excludeRecentDays?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.providerId) qs.set("provider_id", params.providerId);
      if (params.operatoryId) qs.set("operatory_id", params.operatoryId);
      if (params.appointmentTypeId) qs.set("appointment_type_id", params.appointmentTypeId);
      if (params.durationMinutes) qs.set("duration_minutes", String(params.durationMinutes));
      if (params.excludeRecentDays !== undefined)
        qs.set("exclude_recent_days", String(params.excludeRecentDays));
      return api.get<ApiWaitlistPatientCandidate[]>(`/api/waitlist-requests/candidates/asap?${qs.toString()}`);
    },
    searchContinuingCare: (params: {
      recallType?: string;
      startDate?: string;
      endDate?: string;
      excludeRecentDays?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params.recallType) qs.set("recall_type", params.recallType);
      if (params.startDate) qs.set("start_date", params.startDate);
      if (params.endDate) qs.set("end_date", params.endDate);
      if (params.excludeRecentDays !== undefined)
        qs.set("exclude_recent_days", String(params.excludeRecentDays));
      return api.get<ApiWaitlistPatientCandidate[]>(
        `/api/waitlist-requests/candidates/continuing-care?${qs.toString()}`
      );
    },
  },
};
