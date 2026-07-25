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
  FormDisplayType,
  FormField,
  FormFieldType,
  FormPacket,
  FormRequestBatch,
  FormRequestBatchStatus,
  FormSubmission,
  FormTemplate,
  FormTemplateSource,
  FormTemplateStatus,
  InsertionRule,
  MappingCondition,
  MappingRule,
  Operatory,
  Patient,
  PatientTypeRule,
  Provider,
  ProviderStatus,
  RepeatMode,
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
    })),
    pageCount: t.page_count,
    uploadedFileUrl: t.uploaded_file_url,
    digitizeNotes: t.digitize_notes,
    archivedAt: t.archived_at,
    createdAt: t.created_at,
  };
}

export type ApiFormPacket = {
  id: string;
  name: string;
  form_template_ids: string[];
  created_at: string;
};

export function mapFormPacket(p: ApiFormPacket): FormPacket {
  return {
    id: p.id,
    name: p.name,
    formTemplateIds: p.form_template_ids,
    createdAt: p.created_at,
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
  };
}

export type ApiInsertionRule = { id: string; code_type: string; codes: string[] };

export type ApiAppointmentType = {
  id: string;
  name: string;
  duration_minutes: number;
  available_online: boolean;
  patient_type: PatientTypeRule;
  allow_patient_cancel: boolean;
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
  reason: "missed" | "cancelled";
  appointment_at: string | null;
};

export function mapWaitlistPatientCandidate(c: ApiWaitlistPatientCandidate): WaitlistPatientCandidate {
  return { id: c.id, name: c.name, reason: c.reason, appointmentAt: c.appointment_at };
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
    list: (date?: string, patientId?: string) => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (patientId) params.set("patient_id", patientId);
      const qs = params.toString();
      return api.get<ApiAppointment[]>(`/api/appointments${qs ? `?${qs}` : ""}`);
    },
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiAppointment>(`/api/appointments/${id}`, body),
  },
  waitlist: () => api.get<unknown[]>("/api/waitlist"),
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
    copyTemplates: (templateIds: string[], locationIds: string[]) =>
      api.post<{ copied: number }>("/api/forms/templates/copy", {
        template_ids: templateIds,
        location_ids: locationIds,
      }),
    archiveTemplate: (id: string) => api.post<ApiFormTemplate>(`/api/forms/templates/${id}/archive`),
    unarchiveTemplate: (id: string) => api.post<ApiFormTemplate>(`/api/forms/templates/${id}/unarchive`),
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
    },
    requests: {
      list: (tab: "active" | "expired" | "synced" | "all" = "all") =>
        api.get<ApiFormRequestBatch[]>(`/api/forms/requests?tab=${tab}`),
      reactivate: (requestIds: string[], expiresAt: string) =>
        api.post<{ message: string }>("/api/forms/requests/reactivate", {
          request_ids: requestIds,
          expires_at: expiresAt,
        }),
    },
  },
  messages: {
    list: (patientId?: string) =>
      api.get<
        {
          id: string;
          body: string;
          direction: string;
          channel: string;
          sent_at: string;
          patient_name: string;
        }[]
      >(`/api/messages${patientId ? `?patient_id=${patientId}` : ""}`),
    send: (patientId: string, body: string, channel = "sms") =>
      api.post("/api/messages", { patient_id: patientId, body, channel }),
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
  dashboard: () =>
    api.get<{
      appointments_today: number;
      confirmed_count: number;
      waitlist_count: number;
      pending_forms: number;
      pending_payments: number;
    }>("/api/dashboard/stats"),
  appointmentTypes: {
    list: () => api.get<ApiAppointmentType[]>("/api/appointment-types"),
    create: (body: Record<string, unknown>) =>
      api.post<ApiAppointmentType>("/api/appointment-types", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiAppointmentType>(`/api/appointment-types/${id}`, body),
    delete: (id: string) => api.delete(`/api/appointment-types/${id}`),
  },
  mappingRules: {
    list: () => api.get<ApiMappingRule[]>("/api/mapping-rules"),
    create: (body: Record<string, unknown>) => api.post<ApiMappingRule>("/api/mapping-rules", body),
    update: (id: string, body: Record<string, unknown>) =>
      api.patch<ApiMappingRule>(`/api/mapping-rules/${id}`, body),
    delete: (id: string) => api.delete(`/api/mapping-rules/${id}`),
    reorder: (orderedIds: string[]) =>
      api.post<ApiMappingRule[]>("/api/mapping-rules/reorder", { ordered_ids: orderedIds }),
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
    bulkCreate: (names: string[]) =>
      api.post<ApiBookingInsurance[]>("/api/booking-insurances/bulk", { names }),
    delete: (id: string) => api.delete(`/api/booking-insurances/${id}`),
  },
  waitlistRequests: {
    list: () => api.get<ApiWaitlistRequest[]>("/api/waitlist-requests"),
    get: (id: string) => api.get<ApiWaitlistRequest>(`/api/waitlist-requests/${id}`),
    create: (body: {
      slots: { provider_id: string; operatory_id: string | null; starts_at: string; ends_at: string }[];
      patient_ids: string[];
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
  },
};
