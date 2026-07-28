// Public conversational intake agent API (Milestone 3)

import type { MedicalAlertCatalog, PublicBranding, PublicForm, PublicVerifyResult } from "../types";
import { publicFormsApi, type PublicApiError } from "./public-forms-api";

export type { PublicApiError };

export type AgentField = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
  placeholder: string;
};

export type AgentTurn = {
  role: "patient" | "agent" | "system";
  content: string;
  field_id: string | null;
  created_at: string;
};

export type AgentSession = {
  sessionId: string;
  status: string;
  formRequestId: string;
  formName: string;
  patientName: string;
  assistantMessage: string | null;
  turns: AgentTurn[];
  draftAnswers: Record<string, unknown>;
  progress: { answered: number; total: number };
  done: boolean;
  validationStatus?: string | null;
  currentField: AgentField | null;
  medicalAlerts: MedicalAlertCatalog | null;
};

export type AgentAnswerDetail = {
  field_id: string;
  field_label: string;
  raw_patient_text: string;
  parsed_value: unknown;
  ai_generated: boolean;
  status: string;
  sync_target: string | null;
};

export type AgentSessionDetail = {
  session_id: string;
  status: string;
  form_request_id: string;
  form_name: string;
  patient_name: string;
  intake_source: string;
  turns: AgentTurn[];
  answers: AgentAnswerDetail[];
  draft_answers: Record<string, unknown>;
  progress: { answered: number; total: number } | null;
};

type ApiMedicalAlertCatalog = Record<string, { id: string; label: string }[]>;

function mapMedicalAlerts(c: ApiMedicalAlertCatalog | null | undefined): MedicalAlertCatalog | null {
  if (!c) return null;
  return {
    condition: c.condition ?? [],
    allergy: c.allergy ?? [],
    medication: c.medication ?? [],
  };
}

type ApiSessionOut = {
  session_id: string;
  status: string;
  form_request_id: string;
  form_name: string;
  patient_name: string;
  assistant_message: string | null;
  turns: { role: string; content: string; field_id: string | null; created_at: string }[];
  draft_answers: Record<string, unknown>;
  progress: { answered: number; total: number };
  done: boolean;
  validation_status?: string | null;
  current_field?: {
    id: string;
    type: string;
    label: string;
    required: boolean;
    options: string[];
    placeholder: string;
  } | null;
  medical_alerts?: ApiMedicalAlertCatalog | null;
};

function mapSession(r: ApiSessionOut): AgentSession {
  return {
    sessionId: r.session_id,
    status: r.status,
    formRequestId: r.form_request_id,
    formName: r.form_name,
    patientName: r.patient_name,
    assistantMessage: r.assistant_message,
    turns: r.turns.map((t) => ({
      role: t.role as AgentTurn["role"],
      content: t.content,
      field_id: t.field_id,
      created_at: t.created_at,
    })),
    draftAnswers: r.draft_answers,
    progress: r.progress,
    done: r.done,
    validationStatus: r.validation_status,
    currentField: r.current_field
      ? {
          id: r.current_field.id,
          type: r.current_field.type,
          label: r.current_field.label,
          required: r.current_field.required,
          options: r.current_field.options ?? [],
          placeholder: r.current_field.placeholder ?? "",
        }
      : null,
    medicalAlerts: mapMedicalAlerts(r.medical_alerts),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* ignore */
    }
    throw { status: res.status, detail } as PublicApiError;
  }
  return (await res.json()) as T;
}

export const publicAgentApi = {
  tokenInfo: (token: string) => publicFormsApi.tokenInfo(token),
  verify: (token: string, lastName: string, dob: string) =>
    publicFormsApi.verify(token, lastName, dob),

  startSession: (token: string, params: { lastName: string; dob: string; formRequestId: string; sessionId?: string }) =>
    request<ApiSessionOut>("POST", `/api/public/agent/${token}/session`, {
      last_name: params.lastName,
      dob: params.dob,
      form_request_id: params.formRequestId,
      session_id: params.sessionId ?? null,
    }).then(mapSession),

  sendMessage: (
    token: string,
    params: {
      lastName: string;
      dob: string;
      sessionId: string;
      message: string;
      structuredValue?: unknown;
    }
  ) =>
    request<ApiSessionOut>("POST", `/api/public/agent/${token}/message`, {
      last_name: params.lastName,
      dob: params.dob,
      session_id: params.sessionId,
      message: params.message,
      structured_value: params.structuredValue ?? null,
    }).then(mapSession),

  complete: (token: string, params: { lastName: string; dob: string; sessionId: string }) =>
    request<{ remaining: number; message: string }>("POST", `/api/public/agent/${token}/complete`, {
      last_name: params.lastName,
      dob: params.dob,
      session_id: params.sessionId,
    }),
};

export type { PublicBranding, PublicForm, PublicVerifyResult };
