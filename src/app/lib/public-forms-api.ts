// Thin fetch wrapper for the public (unauthenticated) patient forms portal.
// No cookies, no CSRF, no session — this is a separate trust boundary from
// the staff app's cookie-authenticated API in lib/api.ts.

import type { FormDisplayType, FormFieldType, MedicalAlertCatalog, PublicBranding, PublicForm, PublicPacketForm, PublicPacketInfo, PublicVerifyResult } from "../types";

type ApiMedicalAlertCatalog = Record<string, { id: string; label: string }[]>;

function mapMedicalAlertCatalog(c: ApiMedicalAlertCatalog | null | undefined): MedicalAlertCatalog | null {
  if (!c) return null;
  return {
    condition: c.condition ?? [],
    allergy: c.allergy ?? [],
    medication: c.medication ?? [],
  };
}

export type PublicApiError = { status: number; detail: string };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* non-JSON error body */
    }
    throw { status: res.status, detail } as PublicApiError;
  }
  return (await res.json()) as T;
}

type ApiBranding = {
  practice_name: string;
  practice_logo_url: string | null;
  location_name: string;
  location_address: string;
  location_phone: string;
};

type ApiField = {
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

type ApiForm = {
  request_id: string;
  template_id: string;
  name: string;
  display_type: FormDisplayType;
  page_count: number;
  fields: ApiField[];
  completed: boolean;
  expires_at: string;
  medical_alerts?: ApiMedicalAlertCatalog | null;
  prefill_answers?: Record<string, unknown>;
};

type ApiVerifyOut = ApiBranding & { patient_name: string; forms: ApiForm[] };

function mapBranding(b: ApiBranding): PublicBranding {
  return {
    practiceName: b.practice_name,
    practiceLogoUrl: b.practice_logo_url,
    locationName: b.location_name,
    locationAddress: b.location_address,
    locationPhone: b.location_phone,
  };
}

function mapForm(f: ApiForm): PublicForm {
  return {
    requestId: f.request_id,
    templateId: f.template_id,
    name: f.name,
    displayType: f.display_type,
    pageCount: f.page_count,
    completed: f.completed,
    expiresAt: f.expires_at,
    medicalAlerts: mapMedicalAlertCatalog(f.medical_alerts),
    prefillAnswers: f.prefill_answers ?? {},
    fields: f.fields.map((field) => ({
      id: field.id,
      type: field.type,
      label: field.label,
      required: field.required,
      options: field.options,
      page: field.page,
      minLength: field.min_length,
      maxLength: field.max_length,
      conditionalFieldId: field.conditional_field_id,
      conditionalValue: field.conditional_value,
    })),
  };
}

type ApiPacketForm = {
  template_id: string;
  name: string;
  display_type: FormDisplayType;
  page_count: number;
  fields: ApiField[];
  medical_alerts?: ApiMedicalAlertCatalog | null;
};

type ApiPacketInfo = ApiBranding & { packet_name: string; forms: ApiPacketForm[] };

function mapPacketForm(f: ApiPacketForm): PublicPacketForm {
  return {
    templateId: f.template_id,
    name: f.name,
    displayType: f.display_type,
    pageCount: f.page_count,
    medicalAlerts: mapMedicalAlertCatalog(f.medical_alerts),
    fields: f.fields.map((field) => ({
      id: field.id,
      type: field.type,
      label: field.label,
      required: field.required,
      options: field.options,
      page: field.page,
      minLength: field.min_length,
      maxLength: field.max_length,
      conditionalFieldId: field.conditional_field_id,
      conditionalValue: field.conditional_value,
    })),
  };
}

export const publicPacketsApi = {
  info: (code: string) =>
    request<ApiPacketInfo>("GET", `/api/public/packets/${code}`).then(
      (r): PublicPacketInfo => ({ ...mapBranding(r), packetName: r.packet_name, forms: r.forms.map(mapPacketForm) })
    ),

  submit: (
    code: string,
    params: {
      firstName: string;
      lastName: string;
      dob: string;
      phone: string;
      email: string;
      submissions: { templateId: string; answers: Record<string, unknown> }[];
    }
  ) =>
    request<{ submission_id: string }>("POST", `/api/public/packets/${code}/submit`, {
      first_name: params.firstName,
      last_name: params.lastName,
      dob: params.dob,
      phone: params.phone,
      email: params.email,
      submissions: params.submissions.map((s) => ({ template_id: s.templateId, answers: s.answers })),
    }),
};

export const publicFormsApi = {
  tokenInfo: (token: string) =>
    request<ApiBranding>("GET", `/api/public/forms/${token}`).then(mapBranding),

  verify: (token: string, lastName: string, dob: string) =>
    request<ApiVerifyOut>("POST", `/api/public/forms/${token}/verify`, {
      last_name: lastName,
      dob,
    }).then((r): PublicVerifyResult => ({ ...mapBranding(r), patientName: r.patient_name, forms: r.forms.map(mapForm) })),

  submit: (token: string, params: { lastName: string; dob: string; formRequestId: string; answers: Record<string, unknown> }) =>
    request<{ remaining: number }>("POST", `/api/public/forms/${token}/submit`, {
      last_name: params.lastName,
      dob: params.dob,
      form_request_id: params.formRequestId,
      answers: params.answers,
    }),
};
