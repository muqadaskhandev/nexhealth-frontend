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
};

const AuthContext = createContext<AuthState | null>(null);

const NO_PROVIDERS: Providers = { google: false, azure: false, okta: false };

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    authApi.providers().then((p) => alive && setProviders(p)).catch(() => {});
    authApi
      .me()
      .then((s) => alive && applySession(s))
      .catch(() => alive && clearSession());
    return () => {
      alive = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      const session = await authApi.me();
      applySession(session);
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
    }),
    [status, user, locations, activeLocation, providers, login, logout, switchLocation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
