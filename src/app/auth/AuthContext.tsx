// Session state for the whole app: who is logged in, which locations they can
// access, and the currently active location. Bootstraps from the backend on
// mount so a valid cookie session survives a page reload.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiLocation,
  ApiUser,
  authApi,
  Providers,
  Session,
} from "../lib/api";

type Status = "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  status: Status;
  user: ApiUser | null;
  locations: ApiLocation[];
  activeLocation: ApiLocation | null;
  providers: Providers;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchLocation: (locationId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const NO_PROVIDERS: Providers = { google: false, azure: false, okta: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<ApiUser | null>(null);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [activeLocation, setActiveLocation] = useState<ApiLocation | null>(null);
  const [providers, setProviders] = useState<Providers>(NO_PROVIDERS);

  const applySession = useCallback((s: Session) => {
    setUser(s.user);
    setLocations(s.locations);
    setActiveLocation(s.active_location ?? s.locations[0] ?? null);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setLocations([]);
    setActiveLocation(null);
    setStatus("unauthenticated");
  }, []);

  // Bootstrap: which SSO buttons to show + any existing session.
  useEffect(() => {
    let alive = true;

    const params = new URLSearchParams(window.location.search);
    const forceLogout = params.get("logout") === "1";

    async function bootstrap() {
      if (forceLogout) {
        window.history.replaceState({}, "", window.location.pathname);
        try {
          await authApi.logout();
        } catch {
          /* cookies may already be invalid */
        }
        if (alive) clearSession();
        authApi.providers().then((p) => alive && setProviders(p)).catch(() => {});
        return;
      }

      authApi.providers().then((p) => alive && setProviders(p)).catch(() => {});
      try {
        const session = await authApi.me();
        if (alive) applySession(session);
      } catch {
        // Clear stale httpOnly cookies so the login screen is shown cleanly.
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        if (alive) clearSession();
      }
    }

    bootstrap();
    return () => {
      alive = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);

      // Check if 2FA is required
      if ("totp_required" in response && response.totp_required) {
        window.location.href = `/totp-2fa?tx=${encodeURIComponent(response.tx)}`;
        return;
      }

      const session = await authApi.me();
      applySession(session);
      window.location.href = "/";
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const switchLocation = useCallback(async (locationId: string) => {
    const loc = await authApi.switchLocation(locationId);
    setActiveLocation(loc);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await authApi.me();
    applySession(session);
  }, [applySession]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      locations,
      activeLocation,
      providers,
      login,
      logout,
      switchLocation,
      refreshSession,
    }),
    [status, user, locations, activeLocation, providers, login, logout, switchLocation, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
