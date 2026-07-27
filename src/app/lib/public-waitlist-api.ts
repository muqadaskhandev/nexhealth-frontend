import type { PublicApiError, PublicApiErrorDetail } from "./public-booking-api";

export type { PublicApiError, PublicApiErrorDetail };

export type PublicWaitlistSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  provider_name: string;
  operatory_name: string | null;
  label: string;
};

export type PublicWaitlistInfo = {
  practice_name: string;
  location_name: string;
  patient_first_name: string;
  booking_redirect_slug: string;
  slots: PublicWaitlistSlot[];
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail: string | PublicApiErrorDetail = res.statusText;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (data.detail && typeof data.detail === "object") detail = data.detail as PublicApiErrorDetail;
    } catch {
      /* non-JSON */
    }
    throw { status: res.status, detail };
  }
  return (await res.json()) as T;
}

export const publicWaitlistApi = {
  info: (token: string) => request<PublicWaitlistInfo>("GET", `/api/public/waitlist/${token}`),
  claim: (token: string, slotId: string) =>
    request<{ message: string; appointment_id: string; confirmation: string }>(
      "POST",
      `/api/public/waitlist/${token}/claim/${slotId}`
    ),
};
