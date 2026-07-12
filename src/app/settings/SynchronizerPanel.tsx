import { useCallback, useEffect, useState } from "react";
import {
  ConnectionMode,
  EhrConnection,
  EhrSystem,
  Practice,
  practiceApi,
} from "../lib/api";

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

type Props = {
  practice: Practice;
  onPracticeChange: (practice: Practice) => void;
  onNotice: (msg: string) => void;
  onError: (msg: string | null) => void;
};

export function SynchronizerPanel({
  practice,
  onPracticeChange,
  onNotice,
  onError,
}: Props) {
  const [connection, setConnection] = useState<EhrConnection | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("api");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [locationMappings, setLocationMappings] = useState<
    Record<string, { ehr_site_id: string; ehr_site_name: string }>
  >({});
  const [busy, setBusy] = useState(false);

  const loadConnection = useCallback(async () => {
    try {
      const conn = await practiceApi.ehrConnection();
      setConnection(conn);
      setConnectionMode(conn.connection_mode);
      // Only pre-fill non-secret fields; secrets must be re-entered to update.
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
    onError(null);
    try {
      const updated = await practiceApi.connectEhr(ehr);
      onPracticeChange(updated);
      await loadConnection();
      onNotice(`Selected ${ehr.replace("_", " ")}. Enter credentials next.`);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      onError(apiErr?.detail || "Could not select EHR.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCredentials() {
    setBusy(true);
    onError(null);
    try {
      const conn = await practiceApi.saveEhrCredentials({
        connection_mode: connectionMode,
        credentials,
      });
      setConnection(conn);
      onNotice("EHR credentials saved securely.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      onError(apiErr?.detail || "Could not save credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLocationMappings() {
    setBusy(true);
    onError(null);
    try {
      const updated = await practiceApi.mapEhrLocations({
        mappings: practice.locations.map((loc) => ({
          location_id: loc.id,
          ehr_site_id: locationMappings[loc.id]?.ehr_site_id || "",
          ehr_site_name: locationMappings[loc.id]?.ehr_site_name || "",
        })),
      });
      onPracticeChange(updated);
      await loadConnection();
      onNotice("Location mappings saved.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      onError(apiErr?.detail || "Could not save location mappings.");
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setBusy(true);
    onError(null);
    try {
      const result = await practiceApi.testEhrConnection();
      const refreshed = await practiceApi.me();
      onPracticeChange(refreshed);
      await loadConnection();
      if (result.ok) {
        onNotice(result.message);
      } else {
        onError(result.message);
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      onError(apiErr?.detail || "Connection test failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runSync() {
    setBusy(true);
    onError(null);
    try {
      const result = await practiceApi.runEhrSync();
      const refreshed = await practiceApi.me();
      onPracticeChange(refreshed);
      await loadConnection();
      onNotice(
        `${result.message} (${result.patients_imported} new, ${result.patients_updated} updated)`
      );
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      onError(apiErr?.detail || "Sync failed.");
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

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Synchronizer — EHR connection</h3>
        <p className="text-sm text-gray-500 mt-1">
          Connect your clinic EHR, map offices, test the link, and import patients.
        </p>
        <p className={`text-xs mt-2 font-medium ${STATUS_COLORS[practice.sync_status] || ""}`}>
          Status: {practice.sync_status.replace("_", " ")}
          {practice.ehr_system !== "none" && ` · ${practice.ehr_system.replace(/_/g, " ")}`}
          {practice.sync_error && ` — ${practice.sync_error}`}
        </p>
      </div>

      {/* Step 1: Select EHR */}
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

      {/* Step 2: Credentials */}
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

      {/* Step 3: Location mapping */}
      {step2Done && (
        <section className="space-y-3 border-t border-gray-100 pt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Step 3 · Map locations {step3Done && "✓"}
          </h4>
          <p className="text-xs text-gray-500">
            Link each office in NextHealth to an EHR site or office ID.
          </p>
          {practice.locations.map((loc) => (
            <div key={loc.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                <p className="text-xs text-gray-500">{loc.address || "—"}</p>
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

      {/* Step 4: Test & sync */}
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
  );
}
