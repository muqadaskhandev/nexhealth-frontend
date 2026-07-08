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
      detail = typeof data.detail === "string" ? data.detail : detail;
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
};

// ── Typed domain calls ───────────────────────────────────────────────────────
export type ApiLocation = { id: string; name: string; address: string };

export type ApiUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  role: "admin" | "member";
  auth_provider: "password" | "google" | "azure" | "okta";
  is_active: boolean;
  email_verified: boolean;
};

export type Session = {
  user: ApiUser;
  active_location: ApiLocation | null;
  locations: ApiLocation[];
};

export type Providers = { google: boolean; azure: boolean; okta: boolean };

export const authApi = {
  me: () => api.get<Session>("/api/auth/me"),
  providers: () => api.get<Providers>("/api/auth/providers"),
  login: (email: string, password: string) =>
    api.post<ApiUser>("/api/auth/login", { email, password }),
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
