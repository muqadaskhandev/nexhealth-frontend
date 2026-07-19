import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import {
  ConnectionMode,
  EhrConnection,
  EhrSystem,
  Practice,
  practiceApi,
  type ApiLocation,
} from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { formatLocationAddress } from "../lib/locationFormat";
import { LocationEditForm } from "./LocationEditForm";
import { toastError, toastSuccess } from "../lib/toast";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white";

const EHR_OPTIONS: { value: EhrSystem; label: string }[] = [
  { value: "open_dental", label: "Open Dental" },
  { value: "dentrix", label: "Dentrix" },
  { value: "athena", label: "athenahealth" },
  { value: "eclinicalworks", label: "eClinicalWorks" },
  { value: "epic", label: "Epic" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  not_connected: "text-gray-500",
  pending: "text-amber-600",
  connected: "text-green-600",
  error: "text-red-600",
};

const STATUS_BADGE: Record<string, string> = {
  not_connected: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  connected: "bg-sky-50 text-sky-700",
  error: "bg-red-50 text-red-700",
};

type Props = {
  practice: Practice;
  onPracticeChange: (practice: Practice) => void;
  onError?: (msg: string | null) => void;
};

export function SynchronizerPanel({
  practice,
  onPracticeChange,
  onError,
}: Props) {
  const { refreshSession } = useAuth();
  const [connection, setConnection] = useState<EhrConnection | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("api");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [locationMappings, setLocationMappings] = useState<
    Record<string, { ehr_site_id: string; ehr_site_name: string }>
  >({});
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState<ApiLocation | null>(null);

  const loadConnection = useCallback(async () => {
    try {
      const conn = await practiceApi.ehrConnection();
      setConnection(conn);
      setConnectionMode(conn.connection_mode);
      if (conn.credentials_hint) {
        const hints: Record<string, string> = {};
        for (const field of conn.required_fields) {
          if (field.type !== "password") {
            hints[field.key] = conn.credentials_hint[field.key] || "";
          }
        }
        setCredentials(hints);
      }
    } catch {
      setConnection(null);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection, practice.ehr_system, practice.sync_status]);

  useEffect(() => {
    const next: Record<string, { ehr_site_id: string; ehr_site_name: string }> = {};
    for (const loc of practice.locations) {
      next[loc.id] = {
        ehr_site_id: loc.ehr_site_id || "",
        ehr_site_name: loc.ehr_site_name || loc.name,
      };
    }
    setLocationMappings(next);
  }, [practice.locations]);

  async function selectEhr(ehr: EhrSystem) {
    setBusy(true);
    onError?.(null);
    try {
      const updated = await practiceApi.connectEhr(ehr);
      onPracticeChange(updated);
      await loadConnection();
      toastSuccess(`Selected ${ehr.replace("_", " ")}. Enter credentials next.`);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not select EHR.";
      toastError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    setBusy(true);
    onError?.(null);
    try {
      const conn = await practiceApi.saveEhrCredentials({
        connection_mode: connectionMode,
        credentials,
      });
      setConnection(conn);
      toastSuccess("Credentials saved.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save credentials.";
      toastError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveLocationMappings() {
    setBusy(true);
    onError?.(null);
    try {
      const updated = await practiceApi.mapEhrLocations({
        mappings: practice.locations.map((loc) => ({
          location_id: loc.id,
          ehr_site_id: locationMappings[loc.id]?.ehr_site_id || "",
          ehr_site_name: locationMappings[loc.id]?.ehr_site_name || "",
        })),
      });
      onPracticeChange(updated);
      toastSuccess("Location mappings saved.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save location mappings.";
      toastError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    onError?.(null);
    try {
      const result = await practiceApi.testEhrConnection();
      const refreshed = await practiceApi.me();
      onPracticeChange(refreshed);
      await loadConnection();
      toastSuccess(result.message);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Connection test failed.";
      toastError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  async function runSync() {
    setBusy(true);
    onError?.(null);
    try {
      const result = await practiceApi.runEhrSync();
      const refreshed = await practiceApi.me();
      onPracticeChange(refreshed);
      await loadConnection();
      toastSuccess(
        `${result.message} (${result.patients_imported} new, ${result.patients_updated} updated)`
      );
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Sync failed.";
      toastError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  const fields = connection?.required_fields || [];
  const step1Done = practice.ehr_system !== "none";
  const step2Done = connection?.credentials_configured ?? false;
  const step3Done =
    (connection?.locations_mapped ?? 0) === (connection?.locations_total ?? 0) &&
    (connection?.locations_total ?? 0) > 0;
  const step4Done = practice.sync_status === "connected";
  const ehrLabel =
    EHR_OPTIONS.find((o) => o.value === practice.ehr_system)?.label ||
    practice.ehr_system.replace(/_/g, " ");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Synchronizer</h2>
        <p className="text-sm text-gray-500 mt-1">
          The NexHealth Synchronizer is how data gets from your health record system into
          NexHealth. Update location address and phone here for patient communications.
        </p>
      </div>

      {practice.locations.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {editing ? (
            <div className="p-5">
              <LocationEditForm
                location={editing}
                onCancel={() => setEditing(null)}
                onSaved={async (loc) => {
                  const refreshed = await practiceApi.me();
                  onPracticeChange(refreshed);
                  await refreshSession();
                  setEditing(null);
                  toastSuccess(`Updated ${loc.name}.`);
                }}
              />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                {expanded ? (
                  <ChevronDown size={18} className="text-gray-400" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold">
                  EHR
                </span>
                <span className="flex-1 text-sm font-semibold text-gray-900">
                  {step1Done ? ehrLabel : "No health record system"}
                </span>
                {step1Done && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      STATUS_BADGE[practice.sync_status] || STATUS_BADGE.not_connected
                    }`}
                  >
                    {practice.sync_status === "connected"
                      ? "Syncing"
                      : practice.sync_status.replace("_", " ")}
                  </span>
                )}
              </button>
              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {practice.locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-start justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {formatLocationAddress(loc)}
                        </p>
                        {(loc.phone || loc.email) && (
                          <p className="text-xs text-gray-400 mt-1">
                            {[loc.phone, loc.email].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(loc)}
                        className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 transition-colors flex-shrink-0"
                        aria-label={`Edit ${loc.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">EHR connection setup</h3>
          <p className={`text-xs mt-2 font-medium ${STATUS_COLORS[practice.sync_status] || ""}`}>
            Status: {practice.sync_status.replace("_", " ")}
            {practice.ehr_system !== "none" && ` · ${ehrLabel}`}
            {practice.sync_error && ` — ${practice.sync_error}`}
          </p>
        </div>

        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Step 1 · Select EHR {step1Done && "✓"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {EHR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={busy}
                onClick={() => selectEhr(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  practice.ehr_system === opt.value
                    ? "bg-teal-50 border-teal-300 text-teal-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {step1Done && (
          <section className="space-y-3 border-t border-gray-100 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 2 · Credentials {step2Done && "✓"}
            </h4>
            <div className="flex gap-2">
              {(["api", "on_prem"] as ConnectionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={busy}
                  onClick={() => setConnectionMode(mode)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    connectionMode === mode
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {mode === "api" ? "Cloud API" : "On-prem agent"}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {connection?.credentials_configured && (
                <p className="text-xs text-gray-500">
                  Credentials saved. Re-enter secret fields only if you want to change them.
                </p>
              )}
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type === "password" ? "password" : "text"}
                    value={credentials[field.key] || ""}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className={inputCls}
                    placeholder={
                      field.type === "url"
                        ? "https://your-ehr-api.example.com"
                        : field.type === "password" && connection?.credentials_hint[field.key]
                          ? `Saved (${connection.credentials_hint[field.key]})`
                          : ""
                    }
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={busy || fields.length === 0}
              onClick={saveCredentials}
              className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              Save credentials
            </button>
          </section>
        )}

        {step2Done && (
          <section className="space-y-3 border-t border-gray-100 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 3 · Map locations {step3Done && "✓"}
            </h4>
            <p className="text-xs text-gray-500">
              Link each office in NextHealth to an EHR site or office ID.
            </p>
            {practice.locations.map((loc) => (
              <div
                key={loc.id}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                  <p className="text-xs text-gray-500">{formatLocationAddress(loc)}</p>
                </div>
                <input
                  value={locationMappings[loc.id]?.ehr_site_id || ""}
                  onChange={(e) =>
                    setLocationMappings((prev) => ({
                      ...prev,
                      [loc.id]: { ...prev[loc.id], ehr_site_id: e.target.value },
                    }))
                  }
                  className={inputCls}
                  placeholder="EHR site ID"
                />
                <input
                  value={locationMappings[loc.id]?.ehr_site_name || ""}
                  onChange={(e) =>
                    setLocationMappings((prev) => ({
                      ...prev,
                      [loc.id]: { ...prev[loc.id], ehr_site_name: e.target.value },
                    }))
                  }
                  className={inputCls}
                  placeholder="EHR site name"
                />
              </div>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={saveLocationMappings}
              className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              Save location mappings
            </button>
          </section>
        )}

        {step3Done && (
          <section className="space-y-3 border-t border-gray-100 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 4 · Test & sync {step4Done && "✓"}
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={testConnection}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
              >
                Test connection
              </button>
              <button
                type="button"
                disabled={busy || !step4Done}
                onClick={runSync}
                className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
              >
                Import patients from EHR
              </button>
            </div>
            {connection?.last_sync_at && (
              <p className="text-xs text-gray-400">
                Last sync: {new Date(connection.last_sync_at).toLocaleString()}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
