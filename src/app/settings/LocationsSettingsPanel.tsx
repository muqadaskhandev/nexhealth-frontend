import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { authApi, practiceApi, type ApiLocation } from "../lib/api";
import { formatLocationAddress } from "../lib/locationFormat";
import { toastSuccess } from "../lib/toast";
import { IconButton } from "../components/shared/IconButton";
import { LocationEditForm } from "./LocationEditForm";

/**
 * Settings → Locations — full CRUD for practice offices (admin) or read-only
 * list for members.
 */
export function LocationsSettingsPanel() {
  const { user, activeLocation, refreshSession } = useAuth();
  const isAdmin = user?.role === "admin";
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiLocation | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const practice = await practiceApi.me();
        setLocations(practice.locations);
      } else {
        const session = await authApi.me();
        setLocations(session.locations);
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not load locations.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );

  async function afterSave(msg: string) {
    setCreating(false);
    setEditing(null);
    toastSuccess(msg);
    await load();
    await refreshSession();
  }

  if (creating || editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {creating ? "Add location" : "Edit location"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {creating
              ? "Create a new practice office. You will get access automatically."
              : "Update name, address, phone, or email for this office."}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <LocationEditForm
            location={editing}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={async (loc) => {
              await afterSave(
                creating ? `Created ${loc.name}.` : `Updated ${loc.name}.`
              );
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Locations</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Add and manage practice offices. Staff only see locations they are assigned to."
              : "Practice locations you can access. Ask an admin to change addresses or add offices."}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600"
          >
            <Plus size={16} />
            Add location
          </button>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading locations…</p>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-600">No locations yet.</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              Add your first location
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
          {sorted.map((loc) => {
            const active = loc.id === activeLocation?.id;
            return (
              <div
                key={loc.id}
                className={`flex items-start justify-between gap-3 px-5 py-4 ${
                  active ? "bg-teal-50/40" : "bg-white"
                }`}
              >
                <div className="min-w-0 flex items-start gap-3">
                  <MapPin size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                      {active && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {formatLocationAddress(loc)}
                    </p>
                    {(loc.phone || loc.email) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {[loc.phone, loc.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <IconButton
                    label="Edit"
                    onClick={() => setEditing(loc)}
                    className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 flex-shrink-0"
                  >
                    <Pencil size={15} />
                  </IconButton>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
