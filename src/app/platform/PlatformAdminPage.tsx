import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { BrandLogo } from "../components/branding/BrandLogo";
import {
  EnabledProducts,
  OnboardLocationPayload,
  platformApi,
  Practice,
  PracticeCreatePayload,
  PracticeUpdatePayload,
  SubscriptionPlan,
  type ApiLocation,
} from "../lib/api";
import {
  COUNTRY_DIAL_CODES,
  CUSTOM_OPTION,
  US_STATES,
  citiesForState,
  formatLocationAddress,
  formatPhoneWithDial,
  isListedCity,
  isListedDial,
  isListedState,
  parsePhoneWithDial,
} from "../lib/locationFormat";
import { toastError, toastSuccess } from "../lib/toast";
import {
  LocationEditForm,
  type LocationFormValues,
} from "../settings/LocationEditForm";
import { UserMenu } from "../components/layout/UserMenu";
import {
  emailError,
  formatNationalPhoneInput,
  formatZipInput,
  nationalPhoneError,
  zipError,
} from "../lib/fieldFormat";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

const DEFAULT_PRODUCTS: EnabledProducts = {
  scheduling: true,
  forms: true,
  communications: true,
  payments: false,
  verification: false,
};

type LocationDraft = LocationFormValues & {
  key: string;
  linkedFromId?: string;
  linkedFromLabel?: string;
};

type PlatformLocationOption = ApiLocation & {
  practice_id: string;
  practice_name: string;
};

function toLocationFormValues(
  loc: Pick<
    ApiLocation,
    | "name"
    | "address"
    | "address_line2"
    | "city"
    | "state"
    | "zip_code"
    | "phone"
    | "email"
  >
): LocationFormValues {
  return {
    name: loc.name || "",
    address: loc.address || "",
    address_line2: loc.address_line2 || "",
    city: loc.city || "",
    state: loc.state || "",
    zip_code: formatZipInput(loc.zip_code || ""),
    phone: loc.phone || "",
    email: loc.email || "",
  };
}

function LocationAddMethodChooser({
  onCreateNew,
  onChooseExisting,
  onCancel,
  existingDisabled = false,
}: {
  onCreateNew: () => void;
  onChooseExisting: () => void;
  onCancel: () => void;
  existingDisabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-800">Add a location</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Create a brand-new office, or link one that already exists on the platform.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCreateNew}
          className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
        >
          <p className="text-sm font-semibold text-gray-900">Create new</p>
          <p className="text-xs text-gray-500 mt-1">
            Enter a new office name, address, and contact details.
          </p>
        </button>
        <button
          type="button"
          onClick={onChooseExisting}
          disabled={existingDisabled}
          className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-teal-300 hover:bg-teal-50/40 transition-colors disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white"
        >
          <p className="text-sm font-semibold text-gray-900">Choose existing</p>
          <p className="text-xs text-gray-500 mt-1">
            {existingDisabled
              ? "No other locations are available to link yet."
              : "Copy an existing office onto this practice."}
          </p>
        </button>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  );
}

function ExistingLocationPicker({
  options,
  excludeIds,
  onConfirm,
  onCancel,
  confirming = false,
}: {
  options: PlatformLocationOption[];
  excludeIds?: Set<string>;
  onConfirm: (selected: PlatformLocationOption[]) => void | Promise<void>;
  onCancel: () => void;
  confirming?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = useMemo(() => {
    const blocked = excludeIds || new Set<string>();
    const q = query.trim().toLowerCase();
    return options.filter((loc) => {
      if (blocked.has(loc.id)) return false;
      if (!q) return true;
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.practice_name.toLowerCase().includes(q) ||
        (loc.city || "").toLowerCase().includes(q) ||
        (loc.address || "").toLowerCase().includes(q)
      );
    });
  }, [options, excludeIds, query]);

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleConfirm() {
    const rows = options.filter((loc) => selected.has(loc.id));
    if (rows.length === 0) return;
    await onConfirm(rows);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-800">Choose existing locations</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Selected offices are linked onto this practice (details are copied; the original stays
          with its practice).
        </p>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, practice, or city…"
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-gray-400"
        />
      </div>
      <div className="rounded-xl border border-gray-200 max-h-64 overflow-y-auto divide-y divide-gray-100 bg-white">
        {available.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No matching locations.</p>
        ) : (
          available.map((loc) => (
            <label
              key={loc.id}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.has(loc.id)}
                onChange={(e) => toggle(loc.id, e.target.checked)}
                className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="min-w-0">
                <span className="text-sm font-semibold text-gray-900 block">{loc.name}</span>
                <span className="text-xs text-teal-700 font-medium">{loc.practice_name}</span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  {formatLocationAddress(loc)}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={selected.size === 0 || confirming}
          onClick={() => void handleConfirm()}
          className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-60"
        >
          {confirming
            ? "Linking…"
            : `Link ${selected.size || ""} location${selected.size === 1 ? "" : "s"}`.trim()}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export function PlatformAdminPage() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [filteredLocationId, setFilteredLocationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "manage_practices" | "locations">("manage_practices");
  const [settingsLocationsPracticeId, setSettingsLocationsPracticeId] = useState<string | null>(null);
  const [settingsStartCreating, setSettingsStartCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPractices(await platformApi.listPractices());
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not load practices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allLocations = useMemo<PlatformLocationOption[]>(() => {
    const rows: PlatformLocationOption[] = [];
    for (const practice of practices) {
      for (const loc of practice.locations || []) {
        rows.push({
          ...loc,
          practice_id: practice.id,
          practice_name: practice.name,
        });
      }
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [practices]);

  const selectedLocation = useMemo(
    () => allLocations.find((loc) => loc.id === filteredLocationId) || null,
    [allLocations, filteredLocationId]
  );

  const visiblePractices = useMemo(() => {
    if (!selectedLocation) return practices;
    return practices.filter((p) => p.id === selectedLocation.practice_id);
  }, [practices, selectedLocation]);

  function openPracticeLocations(practice: Practice, startCreating = false) {
    setShowForm(false);
    setEditingPractice(null);
    setSettingsLocationsPracticeId(practice.id);
    setSettingsStartCreating(startCreating);
    setSettingsTab("locations");
    setSettingsOpen(true);
  }

  function openSettings(tab: "profile" | "manage_practices" | "locations" = "manage_practices") {
    setShowForm(false);
    setEditingPractice(null);
    setSettingsStartCreating(false);
    if (tab === "locations") {
      if (selectedLocation) {
        setSettingsLocationsPracticeId(selectedLocation.practice_id);
      } else if (!settingsLocationsPracticeId && practices[0]) {
        setSettingsLocationsPracticeId(practices[0].id);
      }
    }
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  const settingsLocationsPractice =
    practices.find((p) => p.id === settingsLocationsPracticeId) || null;

  if (settingsOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <BrandLogo className="h-12 w-auto max-w-[200px] object-contain" alt="NexHealth" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">Platform Admin</h1>
              <p className="text-sm text-gray-500">Onboard practices & assign plans</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <PlatformLocationFilter
              locations={allLocations}
              selected={selectedLocation}
              onSelect={(loc) => {
                setFilteredLocationId(loc ? loc.id : null);
                if (loc) {
                  setSettingsLocationsPracticeId(loc.practice_id);
                  if (settingsTab === "locations") setSettingsStartCreating(false);
                }
              }}
              onClear={() => setFilteredLocationId(null)}
            />
            <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
            <PlatformSettingsMenu
              onOpenSettings={() => openSettings("manage_practices")}
              onOpenLocations={() => openSettings("locations")}
            />
            <UserMenu />
          </div>
        </header>

        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSettingsStartCreating(false);
              setSettingsOpen(false);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft size={15} />
            Settings
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          <nav className="w-56 flex-shrink-0 border-r border-gray-200 bg-white py-4 px-2 overflow-y-auto">
            <div className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Account settings
              </p>
              <button
                type="button"
                onClick={() => {
                  setSettingsStartCreating(false);
                  setSettingsTab("profile");
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  settingsTab === "profile"
                    ? "bg-teal-400 text-white font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Profile
              </button>
            </div>
            <div className="mb-4">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                General
              </p>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsStartCreating(false);
                    setShowForm(false);
                    setEditingPractice(null);
                    setSettingsTab("manage_practices");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    settingsTab === "manage_practices"
                      ? "bg-teal-400 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Manage practices
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsStartCreating(false);
                    setShowForm(false);
                    setEditingPractice(null);
                    if (!settingsLocationsPracticeId && practices[0]) {
                      setSettingsLocationsPracticeId(practices[0].id);
                    }
                    setSettingsTab("locations");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    settingsTab === "locations"
                      ? "bg-teal-400 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Locations
                </button>
              </div>
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {settingsTab === "profile" && <PlatformProfilePanel />}
            {settingsTab === "manage_practices" && (
              <PlatformPracticesPanel
                practices={visiblePractices}
                allLocations={allLocations}
                loading={loading}
                error={error}
                selectedLocation={selectedLocation}
                showForm={showForm}
                editingPractice={editingPractice}
                onClearFilter={() => setFilteredLocationId(null)}
                onToggleOnboard={() => {
                  setEditingPractice(null);
                  setShowForm((v) => !v);
                }}
                onCancelOnboard={() => setShowForm(false)}
                onOnboardSuccess={() => {
                  setShowForm(false);
                  toastSuccess("Practice created. Invite email sent.");
                  load();
                }}
                onEdit={(p) => {
                  setShowForm(false);
                  setEditingPractice(p);
                }}
                onCancelEdit={() => setEditingPractice(null)}
                onEditSuccess={() => {
                  setEditingPractice(null);
                  toastSuccess("Practice updated.");
                  load();
                }}
                onOpenLocations={(p) => openPracticeLocations(p)}
                onToggleActive={async (p) => {
                  try {
                    await platformApi.updatePractice(p.id, { is_active: !p.is_active });
                    toastSuccess(p.is_active ? "Practice deactivated." : "Practice activated.");
                    await load();
                  } catch (err: unknown) {
                    const apiErr = err as { detail?: string };
                    toastError(apiErr?.detail || "Could not update practice status.");
                  }
                }}
                onDelete={async (p) => {
                  if (!window.confirm(`Delete practice "${p.name}"? This cannot be undone.`)) return;
                  try {
                    await platformApi.deletePractice(p.id);
                    toastSuccess(`Deleted ${p.name}.`);
                    if (settingsLocationsPracticeId === p.id) {
                      setSettingsLocationsPracticeId(null);
                    }
                    if (editingPractice?.id === p.id) setEditingPractice(null);
                    await load();
                  } catch (err: unknown) {
                    const apiErr = err as { detail?: string };
                    toastError(apiErr?.detail || "Could not delete practice.");
                  }
                }}
              />
            )}
            {settingsTab === "locations" && (
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-sm font-medium text-gray-700">Practice</label>
                  <select
                    value={settingsLocationsPracticeId || ""}
                    onChange={(e) => {
                      setSettingsLocationsPracticeId(e.target.value || null);
                      setSettingsStartCreating(false);
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[220px]"
                  >
                    <option value="" disabled>
                      Select a practice
                    </option>
                    {practices.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {settingsLocationsPractice ? (
                  <PlatformLocationsManager
                    practice={settingsLocationsPractice}
                    existingLocations={allLocations}
                    startCreating={settingsStartCreating}
                    activeLocationId={filteredLocationId}
                    onSwitchLocation={(locId) => setFilteredLocationId(locId)}
                    onExitCreate={() => setSettingsStartCreating(false)}
                    onPracticeUpdated={(updated) => {
                      setPractices((rows) =>
                        rows.map((row) => (row.id === updated.id ? updated : row))
                      );
                    }}
                    onDeleted={() => load()}
                  />
                ) : (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Locations</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Select a practice to add, manage, and switch offices.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <BrandLogo className="h-12 w-auto max-w-[200px] object-contain" alt="NexHealth" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900">Platform Admin</h1>
            <p className="text-sm text-gray-500">Onboard practices & assign plans</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <PlatformLocationFilter
            locations={allLocations}
            selected={selectedLocation}
            onSelect={(loc) => setFilteredLocationId(loc ? loc.id : null)}
            onClear={() => setFilteredLocationId(null)}
          />
          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
          <PlatformSettingsMenu
            onOpenSettings={() => openSettings("manage_practices")}
            onOpenLocations={() => openSettings("locations")}
          />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        <PlatformPracticesPanel
          practices={visiblePractices}
          allLocations={allLocations}
          loading={loading}
          error={error}
          selectedLocation={selectedLocation}
          showForm={showForm}
          editingPractice={editingPractice}
          onClearFilter={() => setFilteredLocationId(null)}
          onToggleOnboard={() => {
            setEditingPractice(null);
            setShowForm((v) => !v);
          }}
          onCancelOnboard={() => setShowForm(false)}
          onOnboardSuccess={() => {
            setShowForm(false);
            toastSuccess("Practice created. Invite email sent.");
            load();
          }}
          onEdit={(p) => {
            setShowForm(false);
            setEditingPractice(p);
          }}
          onCancelEdit={() => setEditingPractice(null)}
          onEditSuccess={() => {
            setEditingPractice(null);
            toastSuccess("Practice updated.");
            load();
          }}
          onOpenLocations={(p) => openPracticeLocations(p)}
          onToggleActive={async (p) => {
            try {
              await platformApi.updatePractice(p.id, { is_active: !p.is_active });
              toastSuccess(p.is_active ? "Practice deactivated." : "Practice activated.");
              await load();
            } catch (err: unknown) {
              const apiErr = err as { detail?: string };
              toastError(apiErr?.detail || "Could not update practice status.");
            }
          }}
          onDelete={async (p) => {
            if (!window.confirm(`Delete practice "${p.name}"? This cannot be undone.`)) return;
            try {
              await platformApi.deletePractice(p.id);
              toastSuccess(`Deleted ${p.name}.`);
              if (settingsLocationsPracticeId === p.id) setSettingsLocationsPracticeId(null);
              if (editingPractice?.id === p.id) setEditingPractice(null);
              await load();
            } catch (err: unknown) {
              const apiErr = err as { detail?: string };
              toastError(apiErr?.detail || "Could not delete practice.");
            }
          }}
        />
      </main>
    </div>
  );
}

function PlatformSettingsMenu({
  onOpenSettings,
  onOpenLocations,
}: {
  onOpenSettings: () => void;
  onOpenLocations: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors ${
          open ? "ring-2 ring-teal-200 bg-gray-50" : ""
        }`}
        aria-label="Settings menu"
        aria-expanded={open}
      >
        <SettingsIcon size={18} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
          >
            Manage practices
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenLocations();
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2"
          >
            <MapPin size={14} className="text-gray-400" />
            Locations
          </button>
        </div>
      )}
    </div>
  );
}

function PlatformPracticesPanel({
  practices,
  allLocations,
  loading,
  error,
  selectedLocation,
  showForm,
  editingPractice,
  onClearFilter,
  onToggleOnboard,
  onCancelOnboard,
  onOnboardSuccess,
  onEdit,
  onCancelEdit,
  onEditSuccess,
  onOpenLocations,
  onToggleActive,
  onDelete,
}: {
  practices: Practice[];
  allLocations: PlatformLocationOption[];
  loading: boolean;
  error: string | null;
  selectedLocation: PlatformLocationOption | null;
  showForm: boolean;
  editingPractice: Practice | null;
  onClearFilter: () => void;
  onToggleOnboard: () => void;
  onCancelOnboard: () => void;
  onOnboardSuccess: () => void;
  onEdit: (practice: Practice) => void;
  onCancelEdit: () => void;
  onEditSuccess: () => void;
  onOpenLocations: (practice: Practice) => void;
  onToggleActive: (practice: Practice) => void | Promise<void>;
  onDelete: (practice: Practice) => void | Promise<void>;
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Manage practices</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create, update, activate, deactivate, or delete practices.
          </p>
          {selectedLocation && (
            <p className="text-xs text-gray-500 mt-0.5">
              Filtered by location: {selectedLocation.name}
              <button
                type="button"
                onClick={onClearFilter}
                className="ml-2 text-teal-600 hover:text-teal-700 font-medium"
              >
                Clear
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleOnboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
        >
          <Plus size={16} className="shrink-0" /> Onboard practice
        </button>
      </div>

      {showForm && !editingPractice && (
        <OnboardPracticeForm
          existingLocations={allLocations}
          onCancel={onCancelOnboard}
          onSuccess={onOnboardSuccess}
        />
      )}

      {editingPractice && (
        <EditPracticeForm
          practice={editingPractice}
          existingLocations={allLocations}
          onCancel={onCancelEdit}
          onSuccess={onEditSuccess}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : practices.length === 0 ? (
        <p className="text-sm text-gray-500">
          {selectedLocation ? "No practices match this location filter." : "No practices yet."}
        </p>
      ) : (
        <div className="grid gap-4">
          {practices.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden p-1.5">
                <BrandLogo
                  logoUrl={p.logo_url}
                  alt={`${p.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {p.city}, {p.state} · Plan: {p.subscription_plan}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {[
                    p.ehr_system !== "none" && `EHR: ${p.ehr_system.replace(/_/g, " ")}`,
                    p.sync_status !== "not_connected" &&
                      `Sync: ${p.sync_status.replace(/_/g, " ")}`,
                    `${p.locations.length} location(s)`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => onOpenLocations(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 whitespace-nowrap"
                >
                  <MapPin size={14} className="shrink-0" /> Locations
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  <Pencil size={14} className="shrink-0" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(p)}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                    p.is_active
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {p.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
                >
                  <Trash2 size={14} className="shrink-0" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformProfilePanel() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Account</h2>
        <p className="text-sm text-gray-500 mt-1">Your profile and sign-in security.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-white bg-teal-500 px-2 py-0.5 rounded-full">
          {user.account_type === "super_admin" ? "SUPER ADMIN" : (user.role || "member").toUpperCase()}
        </span>
      </div>

      <button
        type="button"
        onClick={() => logout()}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        Log out
      </button>
    </div>
  );
}

function PlatformLocationFilter({
  locations,
  selected,
  onSelect,
  onClear,
}: {
  locations: PlatformLocationOption[];
  selected: PlatformLocationOption | null;
  onSelect: (loc: PlatformLocationOption | null) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const query = locSearch.trim().toLowerCase();
  const filtered = locations.filter((l) => {
    if (!query) return true;
    const haystack = [
      l.name,
      l.practice_name,
      l.address,
      l.address_line2,
      l.city,
      l.state,
      l.zip_code,
      l.phone,
      l.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setLocSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setLocSearch("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const label = selected?.name ?? (locations.length ? "All locations" : "No locations");
  const empty = locations.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={empty}
        onClick={() => {
          if (!empty) setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm text-gray-700 font-medium transition-colors max-w-[280px] whitespace-nowrap ${
          empty
            ? "border-gray-200 cursor-default"
            : open
              ? "border-teal-400 bg-white ring-2 ring-teal-100"
              : "border-teal-300 hover:border-teal-400 hover:bg-gray-50"
        }`}
      >
        <MapPin size={14} className="text-teal-500 flex-shrink-0" />
        <span className="truncate whitespace-nowrap">{label}</span>
        {!empty && (
          <ChevronsUpDown size={14} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && !empty && (
        <div
          role="listbox"
          aria-label="Locations"
          className="absolute top-full right-0 mt-2 w-[22rem] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-gray-900 mb-2">Locations</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-teal-400 bg-white">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-72 pb-2">
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              onClick={() => {
                onClear();
                setOpen(false);
                setLocSearch("");
              }}
              className={`w-full flex items-start justify-between gap-3 px-4 py-3 transition-colors text-left ${
                !selected ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">All locations</p>
                <p className="text-xs text-gray-500 mt-0.5">Show every practice</p>
              </div>
              {!selected && (
                <Check size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
              )}
            </button>

            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">
                No locations match “{locSearch.trim()}”
              </p>
            ) : (
              filtered.map((loc) => {
                const active = loc.id === selected?.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(loc);
                      setOpen(false);
                      setLocSearch("");
                    }}
                    className={`w-full flex items-start justify-between gap-3 px-4 py-3 transition-colors text-left ${
                      active ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {loc.practice_name} · {formatLocationAddress(loc)}
                      </p>
                    </div>
                    {active && (
                      <Check size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformLocationsManager({
  practice,
  existingLocations = [],
  onPracticeUpdated,
  startCreating = false,
  onExitCreate,
  activeLocationId = null,
  onSwitchLocation,
  onDeleted,
}: {
  practice: Practice;
  existingLocations?: PlatformLocationOption[];
  onPracticeUpdated: (practice: Practice) => void;
  startCreating?: boolean;
  onExitCreate?: () => void;
  activeLocationId?: string | null;
  onSwitchLocation?: (locationId: string) => void;
  onDeleted?: () => void;
}) {
  const [locations, setLocations] = useState<ApiLocation[]>(
    () => [...(practice.locations || [])].sort((a, b) => a.name.localeCompare(b.name))
  );
  const [locationStep, setLocationStep] = useState<
    null | "chooser" | "new" | "existing" | "edit"
  >(startCreating ? "chooser" : null);
  const [editing, setEditing] = useState<ApiLocation | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pool = useMemo(
    () => existingLocations.filter((loc) => loc.practice_id !== practice.id),
    [existingLocations, practice.id]
  );
  const excludeIds = useMemo(
    () => new Set(locations.map((loc) => loc.id)),
    [locations]
  );

  useEffect(() => {
    setLocations([...(practice.locations || [])].sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
    setError(null);
    if (!startCreating) setLocationStep(null);
  }, [practice.id]);

  useEffect(() => {
    setLocations([...(practice.locations || [])].sort((a, b) => a.name.localeCompare(b.name)));
  }, [practice.locations]);

  useEffect(() => {
    if (startCreating) setLocationStep("chooser");
  }, [startCreating, practice.id]);

  function stopCreating() {
    setLocationStep(null);
    setEditing(null);
    onExitCreate?.();
  }

  function syncPractice(nextLocations: ApiLocation[]) {
    const sorted = [...nextLocations].sort((a, b) => a.name.localeCompare(b.name));
    setLocations(sorted);
    onPracticeUpdated({ ...practice, locations: sorted });
  }

  async function saveLocation(values: LocationFormValues) {
    setError(null);
    try {
      if (editing) {
        const updated = await platformApi.updatePracticeLocation(
          practice.id,
          editing.id,
          values
        );
        syncPractice(locations.map((row) => (row.id === updated.id ? updated : row)));
        toastSuccess(`Updated ${updated.name}.`);
      } else {
        const created = await platformApi.addPracticeLocation(practice.id, values);
        syncPractice([...locations, created]);
        toastSuccess(`Created ${created.name}.`);
      }
      stopCreating();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save location.";
      setError(msg);
      toastError(msg);
    }
  }

  async function linkExisting(selected: PlatformLocationOption[]) {
    setLinking(true);
    setError(null);
    try {
      const created: ApiLocation[] = [];
      for (const loc of selected) {
        created.push(
          await platformApi.addPracticeLocation(practice.id, toLocationFormValues(loc))
        );
      }
      syncPractice([...locations, ...created]);
      toastSuccess(
        created.length === 1
          ? `Linked ${created[0].name}.`
          : `Linked ${created.length} locations.`
      );
      stopCreating();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not link locations.";
      setError(msg);
      toastError(msg);
    } finally {
      setLinking(false);
    }
  }

  async function deleteLocation(loc: ApiLocation) {
    if (!window.confirm(`Delete location "${loc.name}"?`)) return;
    setDeletingId(loc.id);
    setError(null);
    try {
      await platformApi.deletePracticeLocation(practice.id, loc.id);
      syncPractice(locations.filter((row) => row.id !== loc.id));
      toastSuccess(`Deleted ${loc.name}.`);
      onDeleted?.();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not delete location.";
      setError(msg);
      toastError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  if (locationStep) {
    return (
      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {locationStep === "chooser"
              ? "Add location"
              : locationStep === "existing"
                ? "Choose existing location"
                : locationStep === "new"
                  ? "Create new location"
                  : "Edit location"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {locationStep === "chooser"
              ? `Add an office to ${practice.name} — create new or link an existing one.`
              : locationStep === "existing"
                ? "Select offices from other practices to copy onto this one."
                : locationStep === "new"
                  ? `Create a new office for ${practice.name}. Practice admins get access automatically.`
                  : "Update name, address, phone, or email for this office."}
          </p>
        </div>
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {locationStep === "chooser" ? (
            <LocationAddMethodChooser
              existingDisabled={pool.length === 0}
              onCreateNew={() => setLocationStep("new")}
              onChooseExisting={() => setLocationStep("existing")}
              onCancel={stopCreating}
            />
          ) : locationStep === "existing" ? (
            <ExistingLocationPicker
              options={pool}
              excludeIds={excludeIds}
              confirming={linking}
              onCancel={() => setLocationStep("chooser")}
              onConfirm={(rows) => linkExisting(rows)}
            />
          ) : (
            <LocationEditForm
              persist={false}
              location={editing}
              initialValues={
                editing || {
                  address: practice.address || "",
                  city: practice.city || "",
                  state: practice.state || "",
                  zip_code: practice.zip_code || "",
                  phone: practice.phone || "",
                }
              }
              submitLabel={locationStep === "new" ? "Create location" : "Save"}
              onCancel={() => {
                if (locationStep === "new") setLocationStep("chooser");
                else stopCreating();
                setError(null);
              }}
              onSaved={(values) => saveLocation(values as LocationFormValues)}
            />
          )}
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
            Add, manage, and switch between practice offices. Staff only see locations they are
            assigned to.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setLocationStep("chooser");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 whitespace-nowrap shrink-0"
        >
          <Plus size={16} className="shrink-0" />
          Add location
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {locations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-600">No locations yet.</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setLocationStep("chooser");
            }}
            className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            Add your first location
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
          {locations.map((loc) => {
            const active = loc.id === activeLocationId;
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!active && onSwitchLocation && (
                    <button
                      type="button"
                      onClick={() => onSwitchLocation(loc.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 whitespace-nowrap"
                    >
                      Switch
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(loc);
                      setLocationStep("edit");
                    }}
                    className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 flex-shrink-0"
                    aria-label={`Edit ${loc.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={deletingId !== null || locations.length <= 1}
                    onClick={() => deleteLocation(loc)}
                    className="w-9 h-9 rounded-lg border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-50 flex-shrink-0 disabled:opacity-50"
                    aria-label={`Delete ${loc.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OnboardPracticeForm({
  existingLocations,
  onCancel,
  onSuccess,
}: {
  existingLocations: PlatformLocationOption[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<PracticeCreatePayload>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    subscription_plan: "starter",
    enabled_products: DEFAULT_PRODUCTS,
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
  });
  const [locations, setLocations] = useState<LocationDraft[]>([]);
  /** null | chooser | new form | pick existing | edit draft */
  const [locationStep, setLocationStep] = useState<
    null | "chooser" | "new" | "existing" | "edit"
  >(null);
  const [editingLocationKey, setEditingLocationKey] = useState<string | null>(null);
  const [dial, setDial] = useState("1");
  const [nationalPhone, setNationalPhone] = useState("");
  const [customDial, setCustomDial] = useState(false);
  const [customState, setCustomState] = useState(false);
  const [customCity, setCustomCity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cityOptions = useMemo(
    () => (customState ? [] : citiesForState(form.state || "")),
    [form.state, customState]
  );

  const editingLocation = useMemo(
    () => locations.find((loc) => loc.key === editingLocationKey) || null,
    [locations, editingLocationKey]
  );

  const linkedExcludeIds = useMemo(
    () => new Set(locations.map((loc) => loc.linkedFromId).filter(Boolean) as string[]),
    [locations]
  );

  function set<K extends keyof PracticeCreatePayload>(key: K, value: PracticeCreatePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function closeLocationPanel() {
    setLocationStep(null);
    setEditingLocationKey(null);
  }

  function saveLocationDraft(values: LocationFormValues) {
    if (editingLocationKey) {
      setLocations((rows) =>
        rows.map((row) => (row.key === editingLocationKey ? { ...row, ...values } : row))
      );
    } else {
      setLocations((rows) => [...rows, { ...values, key: crypto.randomUUID() }]);
    }
    closeLocationPanel();
  }

  function linkExisting(selected: PlatformLocationOption[]) {
    setLocations((rows) => {
      const already = new Set(rows.map((r) => r.linkedFromId).filter(Boolean));
      const additions: LocationDraft[] = [];
      for (const loc of selected) {
        if (already.has(loc.id)) continue;
        additions.push({
          ...toLocationFormValues(loc),
          key: crypto.randomUUID(),
          linkedFromId: loc.id,
          linkedFromLabel: loc.practice_name,
        });
      }
      return [...rows, ...additions];
    });
    closeLocationPanel();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (locations.length === 0) {
      const msg = "Add at least one location before creating the practice.";
      setError(msg);
      toastError(msg);
      return;
    }
    const fieldError =
      zipError(form.zip_code || "") ||
      nationalPhoneError(nationalPhone, dial || "1", { required: true }) ||
      emailError(form.admin_email, { required: true });
    if (fieldError) {
      setError(fieldError);
      toastError(fieldError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const phone = formatPhoneWithDial(dial, nationalPhone);
      const locationPayloads: OnboardLocationPayload[] = locations.map((loc) => ({
        name: loc.name.trim(),
        address: loc.address.trim() || form.address || "",
        address_line2: loc.address_line2.trim(),
        city: loc.city.trim() || form.city || "",
        state: loc.state.trim() || form.state || "",
        zip_code: loc.zip_code.trim() || form.zip_code || "",
        phone: loc.phone.trim() || phone,
        email: loc.email.trim(),
      }));
      await platformApi.createPractice({
        ...form,
        phone,
        locations: locationPayloads,
      });
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not create practice.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">
        {locationStep === "chooser"
          ? "Add location"
          : locationStep === "existing"
            ? "Choose existing location"
            : locationStep === "new"
              ? "Create new location"
              : locationStep === "edit"
                ? "Edit location"
                : "New practice"}
      </h3>

      {locationStep === "chooser" ? (
        <LocationAddMethodChooser
          existingDisabled={existingLocations.length === 0}
          onCreateNew={() => setLocationStep("new")}
          onChooseExisting={() => setLocationStep("existing")}
          onCancel={closeLocationPanel}
        />
      ) : locationStep === "existing" ? (
        <ExistingLocationPicker
          options={existingLocations}
          excludeIds={linkedExcludeIds}
          onCancel={() => setLocationStep("chooser")}
          onConfirm={(rows) => {
            linkExisting(rows);
          }}
        />
      ) : locationStep === "new" || locationStep === "edit" ? (
        <LocationEditForm
          persist={false}
          initialValues={
            editingLocation || {
              address: form.address || "",
              city: form.city || "",
              state: form.state || "",
              zip_code: form.zip_code || "",
              phone: formatPhoneWithDial(dial, nationalPhone),
            }
          }
          submitLabel={locationStep === "new" ? "Add location" : "Save location"}
          onCancel={
            locationStep === "new" ? () => setLocationStep("chooser") : closeLocationPanel
          }
          onSaved={(values) => saveLocationDraft(values as LocationFormValues)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Practice name</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                required={!customCity}
                value={customCity ? CUSTOM_OPTION : form.city}
                disabled={!form.state && !customState}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === CUSTOM_OPTION) {
                    setCustomCity(true);
                    set("city", "");
                    return;
                  }
                  setCustomCity(false);
                  set("city", next);
                }}
                className={inputCls}
              >
                <option value="">
                  {form.state || customState ? "Select city" : "Select state first"}
                </option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                <option value={CUSTOM_OPTION} disabled={!form.state && !customState}>
                  Other (enter custom)…
                </option>
              </select>
              {customCity && (
                <input
                  required
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder="Enter city"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                required={!customState}
                value={customState ? CUSTOM_OPTION : form.state}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === CUSTOM_OPTION) {
                    setCustomState(true);
                    setCustomCity(true);
                    set("state", "");
                    set("city", "");
                    return;
                  }
                  setCustomState(false);
                  setCustomCity(false);
                  set("state", next);
                  const cities = citiesForState(next);
                  if (!cities.includes(form.city || "")) set("city", "");
                }}
                className={inputCls}
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
                <option value={CUSTOM_OPTION}>Other (enter custom)…</option>
              </select>
              {customState && (
                <input
                  required
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder="Enter state / province / region"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                value={form.zip_code}
                onChange={(e) => set("zip_code", formatZipInput(e.target.value))}
                className={inputCls}
                placeholder="94114"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.subscription_plan}
                onChange={(e) => set("subscription_plan", e.target.value as SubscriptionPlan)}
                className={inputCls}
              >
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={customDial ? CUSTOM_OPTION : dial}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === CUSTOM_OPTION) {
                      setCustomDial(true);
                      setDial("");
                      return;
                    }
                    setCustomDial(false);
                    setDial(next);
                    setNationalPhone((prev) =>
                      formatNationalPhoneInput(prev, next)
                    );
                  }}
                  className="w-[7.5rem] shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                  aria-label="Country code"
                >
                  {COUNTRY_DIAL_CODES.map((c) => (
                    <option key={`${c.code}-${c.dial}`} value={c.dial}>
                      {c.code} +{c.dial}
                    </option>
                  ))}
                  <option value={CUSTOM_OPTION}>Other…</option>
                </select>
                {customDial && (
                  <input
                    required
                    value={dial}
                    onChange={(e) => setDial(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-20 shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                    placeholder="92"
                    inputMode="numeric"
                    aria-label="Custom country code"
                  />
                )}
                <input
                  required
                  value={nationalPhone}
                  onChange={(e) =>
                    setNationalPhone(formatNationalPhoneInput(e.target.value, dial || "1"))
                  }
                  className={inputCls}
                  placeholder="(555) 123-4567"
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Locations</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Create a new office or link an existing location from another practice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLocationKey(null);
                setLocationStep("chooser");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600"
            >
              <Plus size={16} />
              Add location
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-8 text-center bg-gray-50/50">
              <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600">No locations yet.</p>
              <button
                type="button"
                onClick={() => {
                  setEditingLocationKey(null);
                  setLocationStep("chooser");
                }}
                className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700"
              >
                Add your first location
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {locations.map((loc) => (
                <div
                  key={loc.key}
                  className="flex items-start justify-between gap-3 px-5 py-4 bg-white"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <MapPin size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                        {loc.linkedFromLabel && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            From {loc.linkedFromLabel}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLocationKey(loc.key);
                        setLocationStep("edit");
                      }}
                      className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600"
                      aria-label={`Edit ${loc.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocations((rows) => rows.filter((row) => row.key !== loc.key))
                      }
                      className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                      aria-label={`Remove ${loc.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr className="border-gray-100" />
          <p className="text-sm font-medium text-gray-800">Practice Admin invite (sent via AWS SES)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin email</label>
              <input
                type="email"
                required
                value={form.admin_email}
                onChange={(e) => set("admin_email", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                required
                value={form.admin_first_name}
                onChange={(e) => set("admin_first_name", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                required
                value={form.admin_last_name}
                onChange={(e) => set("admin_last_name", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create & send invite"}
            </button>
            <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function EditPracticeForm({
  practice,
  existingLocations,
  onCancel,
  onSuccess,
}: {
  practice: Practice;
  existingLocations: PlatformLocationOption[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const parsed = parsePhoneWithDial(practice.phone || "");
  const initialCustomState = !!(practice.state && !isListedState(practice.state));
  const initialCustomCity = !!(
    practice.city &&
    (initialCustomState || !isListedCity(practice.state || "", practice.city))
  );
  const initialCustomDial = !isListedDial(parsed.dial);

  const [form, setForm] = useState<PracticeUpdatePayload>({
    name: practice.name,
    address: practice.address || "",
    city: practice.city || "",
    state: practice.state || "",
    zip_code: practice.zip_code || "",
    phone: practice.phone || "",
    subscription_plan: practice.subscription_plan,
    enabled_products: {
      scheduling: practice.enabled_products?.scheduling ?? true,
      forms: practice.enabled_products?.forms ?? true,
      communications: practice.enabled_products?.communications ?? true,
      payments: practice.enabled_products?.payments ?? false,
      verification: practice.enabled_products?.verification ?? false,
    },
    is_active: practice.is_active,
  });
  const [locations, setLocations] = useState<ApiLocation[]>(practice.locations || []);
  const [locationStep, setLocationStep] = useState<
    null | "chooser" | "new" | "existing" | "edit"
  >(null);
  const [editingLocation, setEditingLocation] = useState<ApiLocation | null>(null);
  const [linking, setLinking] = useState(false);
  const [dial, setDial] = useState(parsed.dial || "1");
  const [nationalPhone, setNationalPhone] = useState(formatNationalPhoneInput(parsed.national, parsed.dial || "1"));
  const [customDial, setCustomDial] = useState(initialCustomDial);
  const [customState, setCustomState] = useState(initialCustomState);
  const [customCity, setCustomCity] = useState(initialCustomCity);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cityOptions = useMemo(
    () => (customState ? [] : citiesForState(form.state || "")),
    [form.state, customState]
  );

  const pool = useMemo(
    () => existingLocations.filter((loc) => loc.practice_id !== practice.id),
    [existingLocations, practice.id]
  );

  const excludeIds = useMemo(
    () => new Set(locations.map((loc) => loc.id)),
    [locations]
  );

  function set<K extends keyof PracticeUpdatePayload>(key: K, value: PracticeUpdatePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function closeLocationPanel() {
    setLocationStep(null);
    setEditingLocation(null);
  }

  async function saveLocation(values: LocationFormValues) {
    try {
      if (editingLocation) {
        const updated = await platformApi.updatePracticeLocation(
          practice.id,
          editingLocation.id,
          values
        );
        setLocations((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
        toastSuccess(`Updated ${updated.name}.`);
      } else {
        const created = await platformApi.addPracticeLocation(practice.id, values);
        setLocations((rows) => [...rows, created]);
        toastSuccess(`Created ${created.name}.`);
      }
      closeLocationPanel();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not save location.");
    }
  }

  async function linkExisting(selected: PlatformLocationOption[]) {
    setLinking(true);
    try {
      const created: ApiLocation[] = [];
      for (const loc of selected) {
        const row = await platformApi.addPracticeLocation(
          practice.id,
          toLocationFormValues(loc)
        );
        created.push(row);
      }
      setLocations((rows) => [...rows, ...created]);
      toastSuccess(
        created.length === 1
          ? `Linked ${created[0].name}.`
          : `Linked ${created.length} locations.`
      );
      closeLocationPanel();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not link locations.");
    } finally {
      setLinking(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fieldError =
      zipError(form.zip_code || "") ||
      nationalPhoneError(nationalPhone, dial || "1", { required: true });
    if (fieldError) {
      setError(fieldError);
      toastError(fieldError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await platformApi.updatePractice(practice.id, {
        ...form,
        phone: formatPhoneWithDial(dial, nationalPhone),
      });
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not update practice.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">
        {locationStep === "chooser"
          ? "Add location"
          : locationStep === "existing"
            ? "Choose existing location"
            : locationStep === "new"
              ? "Create new location"
              : locationStep === "edit"
                ? "Edit location"
                : "Edit practice"}
      </h3>

      {locationStep === "chooser" ? (
        <LocationAddMethodChooser
          existingDisabled={pool.length === 0}
          onCreateNew={() => setLocationStep("new")}
          onChooseExisting={() => setLocationStep("existing")}
          onCancel={closeLocationPanel}
        />
      ) : locationStep === "existing" ? (
        <ExistingLocationPicker
          options={pool}
          excludeIds={excludeIds}
          confirming={linking}
          onCancel={() => setLocationStep("chooser")}
          onConfirm={(rows) => linkExisting(rows)}
        />
      ) : locationStep === "new" || locationStep === "edit" ? (
        <LocationEditForm
          persist={false}
          location={editingLocation}
          initialValues={
            editingLocation || {
              address: form.address || "",
              city: form.city || "",
              state: form.state || "",
              zip_code: form.zip_code || "",
              phone: formatPhoneWithDial(dial, nationalPhone),
            }
          }
          submitLabel={locationStep === "new" ? "Add location" : "Save location"}
          onCancel={
            locationStep === "new" ? () => setLocationStep("chooser") : closeLocationPanel
          }
          onSaved={(values) => saveLocation(values as LocationFormValues)}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Practice name</label>
              <input
                required
                value={form.name || ""}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                value={form.address || ""}
                onChange={(e) => set("address", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                required={!customCity}
                value={customCity ? CUSTOM_OPTION : form.city || ""}
                disabled={!form.state && !customState}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === CUSTOM_OPTION) {
                    setCustomCity(true);
                    set("city", "");
                    return;
                  }
                  setCustomCity(false);
                  set("city", next);
                }}
                className={inputCls}
              >
                <option value="">
                  {form.state || customState ? "Select city" : "Select state first"}
                </option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                <option value={CUSTOM_OPTION} disabled={!form.state && !customState}>
                  Other (enter custom)…
                </option>
              </select>
              {customCity && (
                <input
                  required
                  value={form.city || ""}
                  onChange={(e) => set("city", e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder="Enter city"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                required={!customState}
                value={customState ? CUSTOM_OPTION : form.state || ""}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === CUSTOM_OPTION) {
                    setCustomState(true);
                    setCustomCity(true);
                    set("state", "");
                    set("city", "");
                    return;
                  }
                  setCustomState(false);
                  setCustomCity(false);
                  set("state", next);
                  const cities = citiesForState(next);
                  if (!cities.includes(form.city || "")) set("city", "");
                }}
                className={inputCls}
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
                <option value={CUSTOM_OPTION}>Other (enter custom)…</option>
              </select>
              {customState && (
                <input
                  required
                  value={form.state || ""}
                  onChange={(e) => set("state", e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder="Enter state / province / region"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                value={form.zip_code || ""}
                onChange={(e) => set("zip_code", formatZipInput(e.target.value))}
                className={inputCls}
                placeholder="94114"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.subscription_plan || "starter"}
                onChange={(e) => set("subscription_plan", e.target.value as SubscriptionPlan)}
                className={inputCls}
              >
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={customDial ? CUSTOM_OPTION : dial}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === CUSTOM_OPTION) {
                      setCustomDial(true);
                      setDial("");
                      return;
                    }
                    setCustomDial(false);
                    setDial(next);
                    setNationalPhone((prev) =>
                      formatNationalPhoneInput(prev, next)
                    );
                  }}
                  className="w-[7.5rem] shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                  aria-label="Country code"
                >
                  {COUNTRY_DIAL_CODES.map((c) => (
                    <option key={`${c.code}-${c.dial}`} value={c.dial}>
                      {c.code} +{c.dial}
                    </option>
                  ))}
                  <option value={CUSTOM_OPTION}>Other…</option>
                </select>
                {customDial && (
                  <input
                    required
                    value={dial}
                    onChange={(e) => setDial(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-20 shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
                    placeholder="92"
                    inputMode="numeric"
                    aria-label="Custom country code"
                  />
                )}
                <input
                  required
                  value={nationalPhone}
                  onChange={(e) =>
                    setNationalPhone(formatNationalPhoneInput(e.target.value, dial || "1"))
                  }
                  className={inputCls}
                  placeholder="(555) 123-4567"
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Practice is active
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Locations</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Create a new office or link an existing location from another practice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLocation(null);
                setLocationStep("chooser");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600"
            >
              <Plus size={16} />
              Add location
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-8 text-center bg-gray-50/50">
              <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600">No locations yet.</p>
              <button
                type="button"
                onClick={() => {
                  setEditingLocation(null);
                  setLocationStep("chooser");
                }}
                className="mt-3 text-sm font-semibold text-teal-600 hover:text-teal-700"
              >
                Add your first location
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-start justify-between gap-3 px-5 py-4 bg-white"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <MapPin size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
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
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLocation(loc);
                      setLocationStep("edit");
                    }}
                    className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600"
                    aria-label={`Edit ${loc.name}`}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
