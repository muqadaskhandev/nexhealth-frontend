import { api } from "./api";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  FormSubmission,
  InsertionRule,
  MappingCondition,
  MappingRule,
  Patient,
  PatientTypeRule,
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
    templates: () => api.get<{ id: string; name: string; form_type: string }[]>("/api/forms/templates"),
    submissions: () => api.get<ApiFormSubmission[]>("/api/forms/submissions"),
    send: (patientId: string, formTemplateId: string) =>
      api.post("/api/forms/send", { patient_id: patientId, form_template_id: formTemplateId }),
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
};
