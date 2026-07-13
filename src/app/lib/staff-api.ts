import { api } from "./api";
import type { Appointment, AppointmentStatus, FormSubmission, Patient } from "../types";

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

/** Parses a "MM/DD/YYYY" (or already-ISO "YYYY-MM-DD") input into an ISO date string. */
export function parseDob(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
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
};
