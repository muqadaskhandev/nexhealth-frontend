// Public (unauthenticated) online booking API.

export type PublicApiError = { status: number; detail: string | PublicApiErrorDetail };

export type PublicApiErrorDetail = {
  code?: string;
  message?: string;
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
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (data.detail && typeof data.detail === "object") {
        detail = data.detail as PublicApiErrorDetail;
      }
    } catch {
      /* non-JSON */
    }
    throw { status: res.status, detail } as PublicApiError;
  }
  return (await res.json()) as T;
}

export type PublicBookingLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  logo_url: string | null;
  separate_by_patient_type: boolean;
  ask_for_insurance: boolean;
};

export type PublicBookingInfo = {
  practice_name: string;
  practice_logo_url: string | null;
  separate_by_patient_type: boolean;
  payments_enabled: boolean;
  booking_redirect_url: string;
  locations: PublicBookingLocation[];
};

export type PublicBookingInsurance = {
  id: string;
  name: string;
};

export type PublicBookingType = {
  id: string;
  name: string;
  duration_minutes: number;
  patient_type: string;
};

export type PublicBookingProvider = {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
};

export type PublicBookingTimeSlot = {
  minutes: number;
  label: string;
  provider_id: string;
  provider_name: string;
  starts_at: string;
};

export type PublicBookingOpening = {
  date: string;
  times: PublicBookingTimeSlot[];
};

export type PublicBookingFormField = {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  show_to: string;
  options: string[];
  help_text: string;
};

export function practiceSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") || "practice";
}

/** How patients reach online booking: classic widget, Angelina chat, or a choice screen. */
export type BookingLinkMode = "form" | "agent" | "both";

function bookingSearchParams(
  practiceId: string,
  params?: Record<string, string | undefined>
): URLSearchParams {
  const qs = new URLSearchParams({ lid: practiceId.slice(0, 8) });
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) qs.set(k, v);
    }
  }
  return qs;
}

export function buildBookingLink(
  practiceName: string,
  practiceId: string,
  params?: Record<string, string | undefined>,
  mode: BookingLinkMode = "form"
): string {
  const slug = practiceSlug(practiceName);
  const qs = bookingSearchParams(practiceId, params);
  if (mode === "both") qs.set("mode", "both");
  else qs.delete("mode");
  const path = mode === "agent" ? `/appt/${slug}/chat` : `/appt/${slug}`;
  return `${window.location.origin}${path}?${qs.toString()}`;
}

/** Conversational booking — same query params as the classic widget. */
export function buildChatBookingLink(
  practiceName: string,
  practiceId: string,
  params?: Record<string, string | undefined>
): string {
  return buildBookingLink(practiceName, practiceId, params, "agent");
}

/** Landing page where the patient picks classic widget or Angelina. */
export function buildChooseBookingLink(
  practiceName: string,
  practiceId: string,
  params?: Record<string, string | undefined>
): string {
  return buildBookingLink(practiceName, practiceId, params, "both");
}

/** Conversion-analytics link with standard UTM parameters for marketing tracking. */
export function buildConversionBookingLink(
  practiceName: string,
  practiceId: string,
  params?: Record<string, string | undefined>,
  utm?: { source?: string; medium?: string; campaign?: string; content?: string },
  mode: BookingLinkMode = "form"
): string {
  const base = buildBookingLink(practiceName, practiceId, params, mode);
  const url = new URL(base);
  url.searchParams.set("utm_source", utm?.source ?? "website");
  url.searchParams.set("utm_medium", utm?.medium ?? "button");
  url.searchParams.set("utm_campaign", utm?.campaign ?? "online_booking");
  if (utm?.content) url.searchParams.set("utm_content", utm.content);
  return url.toString();
}

export function buildConversionEmbedCode(link: string, buttonHex: string, _assetName?: string): string {
  const safeLink = link.replace(/"/g, "&quot;");
  // Always use an HTML button (not external CDN images) so Book Now works offline / without NexHealth assets.
  const inner = `<span style="display:inline-block;background:${buttonHex};color:#fff;padding:12px 24px;border-radius:9999px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;">Book Now</span>`;
  return `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" data-nexhealth-booking="true" style="text-decoration:none;">${inner}</a>`;
}

/** Built-in thank-you page for post-booking redirect. */
export function buildBookingThankYouUrl(practiceName?: string): string {
  const url = new URL(`${window.location.origin}/booking/thank-you`);
  if (practiceName) url.searchParams.set("practice", practiceName);
  return url.toString();
}

function qs(extra: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extra)) {
    if (v) params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const publicBookingApi = {
  info: (slug: string, lid?: string, locationIds?: string) =>
    request<PublicBookingInfo>(
      "GET",
      `/api/public/booking/${slug}${qs({ lid, location_ids: locationIds })}`
    ),

  types: (slug: string, locationId: string, patientKind: string, lid?: string, appointmentTypeIds?: string) =>
    request<PublicBookingType[]>(
      "GET",
      `/api/public/booking/${slug}/types${qs({
        location_id: locationId,
        patient_kind: patientKind,
        lid,
        appointment_type_ids: appointmentTypeIds,
      })}`
    ),

  providers: (slug: string, locationId: string, appointmentTypeId: string, lid?: string, providerIds?: string) =>
    request<PublicBookingProvider[]>(
      "GET",
      `/api/public/booking/${slug}/providers${qs({
        location_id: locationId,
        appointment_type_id: appointmentTypeId,
        lid,
        provider_ids: providerIds,
      })}`
    ),

  openings: (
    slug: string,
    locationId: string,
    appointmentTypeId: string,
    opts?: { providerId?: string; lid?: string; providerIds?: string; days?: number }
  ) =>
    request<PublicBookingOpening[]>(
      "GET",
      `/api/public/booking/${slug}/openings${qs({
        location_id: locationId,
        appointment_type_id: appointmentTypeId,
        provider_id: opts?.providerId,
        lid: opts?.lid,
        provider_ids: opts?.providerIds,
        days: opts?.days ? String(opts.days) : undefined,
      })}`
    ),

  formFields: (slug: string, locationId: string, patientKind: string, lid?: string) =>
    request<PublicBookingFormField[]>(
      "GET",
      `/api/public/booking/${slug}/form-fields${qs({
        location_id: locationId,
        patient_kind: patientKind,
        lid,
      })}`
    ),

  insurances: (slug: string, locationId: string, lid?: string) =>
    request<PublicBookingInsurance[]>(
      "GET",
      `/api/public/booking/${slug}/insurances${qs({ location_id: locationId, lid })}`
    ),

  book: (
    slug: string,
    body: {
      location_id: string;
      appointment_type_id: string;
      provider_id: string;
      starts_at: string;
      patient_kind: "new" | "existing";
      booking_for?: "self" | "child" | "other";
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      dob?: string;
      zip_code?: string;
      gender?: string;
      guarantor_first_name?: string;
      guarantor_last_name?: string;
      guarantor_email?: string;
      guarantor_phone?: string;
      call_text_consent?: boolean;
      insurance_id?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      form_answers?: Record<string, unknown>;
    },
    lid?: string
  ) =>
    request<{ message: string; appointment_id: string; confirmation: string; email_sent?: boolean; email?: string }>(
      "POST",
      `/api/public/booking/${slug}/book${qs({ lid })}`,
      body
    ),
};
