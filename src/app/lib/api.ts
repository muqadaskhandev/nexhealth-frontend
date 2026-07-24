// Thin fetch wrapper for the NexHealth backend.
//
// - Sends cookies on every request (credentials: "include") so the httpOnly
//   access/refresh cookies flow automatically.
// - Injects the double-submit CSRF header on state-changing requests by reading
//   the non-httpOnly `csrf_token` cookie the backend sets.
// - Transparently retries once through /api/auth/refresh on a 401, so an expired
//   access token is renewed without bouncing the user to the login screen.

export type ApiError = { status: number; detail: string };

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

async function raw(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!SAFE.has(method)) {
    const csrf = readCookie("csrf_token");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  return fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { retry = true }: { retry?: boolean } = {}
): Promise<T> {
  let res = await raw(method, path, body);

  // One transparent refresh + retry on auth failure (but never for the auth
  // endpoints themselves, to avoid loops).
  if (res.status === 401 && retry && !path.startsWith("/api/auth/")) {
    const refreshed = await raw("POST", "/api/auth/refresh");
    if (refreshed.ok) res = await raw(method, path, body);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        detail = data.detail
          .map((item: { msg?: string }) => item.msg)
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      /* non-JSON error body */
    }
    throw { status: res.status, detail } as ApiError;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

// ── Typed domain calls ───────────────────────────────────────────────────────
export type ApiLocation = {
  id: string;
  name: string;
  address: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  logo_url?: string | null;
  ehr_site_id?: string | null;
  ehr_site_name?: string | null;
  separate_by_patient_type?: boolean;
  allow_cancellations_for_unmapped?: boolean;
  set_availability_by_operatory?: boolean;
  ask_for_insurance?: boolean;
  reserve_with_google?: boolean;
};

export type ApiUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  role: "admin" | "member";
  account_type: "super_admin" | "practice";
  auth_provider: "password" | "google" | "azure" | "okta";
  is_active: boolean;
  email_verified: boolean;
  totp_enabled: boolean;
  practice_id: string | null;
};

export type Session = {
  user: ApiUser;
  active_location: ApiLocation | null;
  locations: ApiLocation[];
};

export type Providers = { google: boolean; azure: boolean; okta: boolean };

export type LoginResponse = ApiUser | { totp_required: boolean; tx: string };

export const authApi = {
  me: () => api.get<Session>("/api/auth/me"),
  providers: () => api.get<Providers>("/api/auth/providers"),
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),
  logout: () => api.post<{ message: string }>("/api/auth/logout"),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/api/auth/forgot-password", { email }),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ message: string }>("/api/auth/change-password", {
      current_password,
      new_password,
    }),
  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>(
      "POST",
      "/api/auth/reset-password",
      { token, new_password },
      { retry: false }
    ),
  totpSetup: () =>
    api.post<{ secret: string; provisioning_uri: string }>("/api/auth/totp/setup"),
  totpEnable: (code: string) =>
    api.post<{ message: string }>("/api/auth/totp/enable", { code }),
  totpDisable: (code: string) =>
    api.post<{ message: string }>("/api/auth/totp/disable", { code }),
  totpVerify: (code: string, tx: string) =>
    request<{ message: string }>(
      "POST",
      `/api/auth/totp/verify?tx=${encodeURIComponent(tx)}`,
      { code }
    ),
  switchLocation: (locationId: string) =>
    api.post<ApiLocation>("/api/locations/switch", { location_id: locationId }),
};

export type UserDetail = ApiUser & { locations: ApiLocation[] };

export type UserCreatePayload = {
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "member";
  password?: string;
  location_ids: string[];
};

export type UserUpdatePayload = {
  first_name?: string;
  last_name?: string;
  role?: "admin" | "member";
  is_active?: boolean;
  location_ids?: string[];
};

export const usersApi = {
  list: () => api.get<UserDetail[]>("/api/users"),
  create: (body: UserCreatePayload) => api.post<UserDetail>("/api/users", body),
  update: (id: string, body: UserUpdatePayload) =>
    api.patch<UserDetail>(`/api/users/${id}`, body),
  sendReset: (id: string) =>
    api.post<{ message: string }>(`/api/users/${id}/send-reset`),
};

// The SSO login endpoints are full-page navigations (not fetch), so the browser
// follows the provider redirect chain.
export function ssoLoginUrl(provider: "google" | "azure" | "okta"): string {
  return `/api/auth/sso/${provider}/login`;
}

export const ssoApi = {
  totpVerify: (code: string, tx: string) =>
    request<{ message: string }>(
      "POST",
      `/api/auth/sso/totp/verify?tx=${encodeURIComponent(tx)}`,
      { code }
    ),
};

// ── Platform (Super Admin) ───────────────────────────────────────────────────
export type SubscriptionPlan = "starter" | "professional" | "enterprise";
export type EhrSystem =
  | "none"
  | "open_dental"
  | "dentrix"
  | "athena"
  | "eclinicalworks"
  | "epic"
  | "other";
export type SyncStatus = "not_connected" | "pending" | "connected" | "error";
export type ConnectionMode = "api" | "on_prem";

export type EnabledProducts = {
  scheduling: boolean;
  forms: boolean;
  communications: boolean;
  payments: boolean;
  verification: boolean;
};

export type Practice = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  subscription_plan: SubscriptionPlan;
  enabled_products: EnabledProducts;
  ehr_system: EhrSystem;
  sync_status: SyncStatus;
  sync_error: string | null;
  is_active: boolean;
  locations: ApiLocation[];
};

export type CredentialField = {
  key: string;
  label: string;
  type: string;
};

export type EhrConnection = {
  ehr_system: EhrSystem;
  connection_mode: ConnectionMode;
  credentials_configured: boolean;
  credentials_hint: Record<string, string>;
  connector_installed: boolean;
  last_tested_at: string | null;
  last_sync_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  required_fields: CredentialField[];
  locations_mapped: number;
  locations_total: number;
};

export type PracticeCreatePayload = {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  subscription_plan?: SubscriptionPlan;
  enabled_products?: EnabledProducts;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  default_location_name?: string;
};

export const platformApi = {
  listPractices: () => api.get<Practice[]>("/api/platform/practices"),
  createPractice: (body: PracticeCreatePayload) =>
    api.post<Practice>("/api/platform/practices", body),
};

export const practiceApi = {
  me: () => api.get<Practice>("/api/practice/me"),
  update: (body: Partial<Practice> & { enabled_products?: EnabledProducts }) =>
    api.patch<Practice>("/api/practice/me", body),
  connectEhr: (ehr_system: EhrSystem) =>
    api.post<Practice>("/api/practice/me/ehr", { ehr_system }),
  ehrConnection: () => api.get<EhrConnection>("/api/practice/me/ehr/connection"),
  saveEhrCredentials: (body: {
    connection_mode: ConnectionMode;
    credentials: Record<string, string>;
  }) => api.post<EhrConnection>("/api/practice/me/ehr/credentials", body),
  mapEhrLocations: (body: {
    mappings: Array<{
      location_id: string;
      ehr_site_id: string;
      ehr_site_name?: string;
    }>;
  }) => api.put<Practice>("/api/practice/me/ehr/locations", body),
  testEhrConnection: () =>
    api.post<{ ok: boolean; message: string; sync_status: SyncStatus }>(
      "/api/practice/me/ehr/test"
    ),
  runEhrSync: () =>
    api.post<{
      ok: boolean;
      message: string;
      patients_imported: number;
      patients_updated: number;
      sync_status: SyncStatus;
    }>("/api/practice/me/ehr/sync"),
  addLocation: (body: {
    name: string;
    address?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
  }) => api.post<ApiLocation>("/api/practice/locations", body),
  updateLocation: (
    locationId: string,
    body: {
      name?: string;
      address?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      zip_code?: string;
      phone?: string;
      email?: string;
      separate_by_patient_type?: boolean;
      allow_cancellations_for_unmapped?: boolean;
      set_availability_by_operatory?: boolean;
      ask_for_insurance?: boolean;
      reserve_with_google?: boolean;
    }
  ) => api.patch<ApiLocation>(`/api/practice/locations/${locationId}`, body),
  uploadLocationLogo: async (locationId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/practice/locations/${locationId}/logo`, {
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
    return (await res.json()) as ApiLocation;
  },
  removeLocationLogo: (locationId: string) =>
    api.delete<ApiLocation>(`/api/practice/locations/${locationId}/logo`),
  copyLocationLogo: (locationId: string, locationIds: string[]) =>
    api.post<ApiLocation[]>(`/api/practice/locations/${locationId}/logo/copy`, {
      location_ids: locationIds,
    }),
  copyReserveWithGoogle: (locationId: string, locationIds: string[]) =>
    api.post<ApiLocation[]>(`/api/practice/locations/${locationId}/reserve-with-google/copy`, {
      location_ids: locationIds,
    }),
  inviteStaff: (body: {
    email: string;
    first_name: string;
    last_name: string;
    role: "admin" | "member";
    location_ids: string[];
  }) => api.post<{ message: string }>("/api/practice/invite-staff", body),
};

export const invitesApi = {
  preview: (token: string) =>
    api.get<{
      email: string;
      first_name: string;
      last_name: string;
      practice_name: string;
      invite_type: string;
      expires_at: string;
    }>(`/api/invites/preview?token=${encodeURIComponent(token)}`),
  accept: (token: string, password: string) =>
    request<ApiUser>(
      "POST",
      "/api/invites/accept",
      { token, password },
      { retry: false }
    ),
};
