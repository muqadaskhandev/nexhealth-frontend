import { useEffect, useState } from "react";
import { Search, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { staffApi, mapAppointmentType } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { AppointmentTypeModal } from "./AppointmentTypeModal";
import { CopyAppointmentTypesModal } from "./CopyAppointmentTypesModal";
import { MappingRulesView } from "./MappingRulesView";
import { PreviewBookingModal } from "./PreviewBookingModal";
import { ProvidersAvailabilityView } from "./ProvidersAvailabilityView";
import { BookingFormFieldsView } from "./BookingFormFieldsView";
import { BookingInsuranceView } from "./BookingInsuranceView";
import { BulkEditPatientTypeModal } from "./BulkEditPatientTypeModal";
import { OnlineBookingLinksView } from "./OnlineBookingLinksView";
import { ReserveWithGoogleView } from "./ReserveWithGoogleView";
import { OneClickBookingView } from "./OneClickBookingView";
import { AppointmentTypesHeader } from "./AppointmentTypesHeader";
import { IconButton } from "../../components/shared/IconButton";
import type { AppointmentType } from "../../types";

type Tab = "new" | "existing" | "unavailable";
type View = "types" | "mapping" | "availability" | "fields" | "insurance" | "links" | "google" | "oneclick";

const TAB_META: Record<
  Tab,
  { label: string; title: string; description: string }
> = {
  new: {
    label: "New patients",
    title: "New patients",
    description: "Only new patients are able to book these appointments during online booking.",
  },
  existing: {
    label: "Existing patients",
    title: "Existing patients",
    description: "Only existing patients are able to book these appointments during online booking.",
  },
  unavailable: {
    label: "Unavailable",
    title: "Unavailable",
    description: "These appointment types are not shown during online booking.",
  },
};

function matchesTab(t: AppointmentType, tab: Tab): boolean {
  if (tab === "unavailable") return !t.availableOnline;
  if (!t.availableOnline) return false;
  if (tab === "new") return t.patientType === "new" || t.patientType === "all";
  return t.patientType === "existing" || t.patientType === "all";
}

function mergeTabOrder(allTypes: AppointmentType[], tabOrder: AppointmentType[]): string[] {
  const tabIds = new Set(tabOrder.map((t) => t.id));
  const merged: AppointmentType[] = [];
  let tabIdx = 0;
  for (const t of allTypes) {
    if (tabIds.has(t.id)) merged.push(tabOrder[tabIdx++]);
    else merged.push(t);
  }
  return merged.map((t) => t.id);
}

export function OnlineBookingSection({ embedded = false }: { embedded?: boolean } = {}) {
  const { activeLocation, locations } = useAuth();
  const [view, setView] = useState<View>("types");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("new");
  const [editing, setEditing] = useState<AppointmentType | "new" | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [copyingTypes, setCopyingTypes] = useState(false);
  const [separateByType, setSeparateByType] = useState(activeLocation?.separate_by_patient_type ?? true);
  const [allowCancelUnmapped, setAllowCancelUnmapped] = useState(
    activeLocation?.allow_cancellations_for_unmapped ?? false
  );
  const [confirmingSeparateByType, setConfirmingSeparateByType] = useState(false);
  const [savingSeparateByType, setSavingSeparateByType] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<AppointmentType[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    setSeparateByType(activeLocation?.separate_by_patient_type ?? true);
    setAllowCancelUnmapped(activeLocation?.allow_cancellations_for_unmapped ?? false);
  }, [activeLocation]);

  function refresh() {
    setLoading(true);
    staffApi.appointmentTypes
      .list()
      .then((rows) => setTypes(rows.map(mapAppointmentType)))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function toggleLocationSetting(
    key: "separate_by_patient_type" | "allow_cancellations_for_unmapped",
    value: boolean,
    targetLocations = locations
  ) {
    if (!activeLocation || targetLocations.length === 0) return;
    const setLocal = key === "separate_by_patient_type" ? setSeparateByType : setAllowCancelUnmapped;
    const previous = !value;
    setLocal(value);
    try {
      await Promise.all(targetLocations.map((loc) => practiceApi.updateLocation(loc.id, { [key]: value })));
      toastSuccess(
        key === "separate_by_patient_type"
          ? `Separate appointment types by patient type turned ${value ? "on" : "off"}${targetLocations.length > 1 ? " for all locations" : ""}`
          : `Cancellations for unmapped appointments turned ${value ? "on" : "off"}`
      );
    } catch (err: unknown) {
      setLocal(previous);
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update this setting — please try again.");
    }
  }

  function handleSeparateByTypeChange(value: boolean) {
    // Turning it ON changes the booking form for every location, so confirm first —
    // turning it off has no such warning in the reference and applies immediately.
    if (value) setConfirmingSeparateByType(true);
    else toggleLocationSetting("separate_by_patient_type", false);
  }

  async function confirmSeparateByType() {
    setSavingSeparateByType(true);
    await toggleLocationSetting("separate_by_patient_type", true, locations);
    setSavingSeparateByType(false);
    setConfirmingSeparateByType(false);
  }

  useEffect(() => {
    setReordering(false);
    setReorderDraft([]);
  }, [tab]);

  if (view === "mapping") {
    return <MappingRulesView types={types} onBack={() => setView("types")} />;
  }
  if (view === "availability") {
    return <ProvidersAvailabilityView onBack={() => setView("types")} />;
  }
  if (view === "fields") {
    return <BookingFormFieldsView onBack={() => setView("types")} />;
  }
  if (view === "insurance") {
    return <BookingInsuranceView onBack={() => setView("types")} />;
  }
  if (view === "links") {
    return <OnlineBookingLinksView types={types} onBack={() => setView("types")} />;
  }
  if (view === "google") {
    return <ReserveWithGoogleView onBack={() => setView("types")} />;
  }
  if (view === "oneclick") {
    return <OneClickBookingView types={types} onBack={() => setView("types")} />;
  }

  const filtered = types.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const tabbed = filtered.filter((t) => matchesTab(t, tab));
  const displayList = reordering ? reorderDraft : tabbed;
  const meta = TAB_META[tab];

  function startReorder() {
    setReorderDraft([...tabbed]);
    setReordering(true);
  }

  function cancelReorder() {
    setReordering(false);
    setReorderDraft([]);
  }

  function moveInReorder(index: number, dir: -1 | 1) {
    setReorderDraft((prev) => {
      const next = [...prev];
      const swapWith = index + dir;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  async function saveReorder() {
    if (savingOrder) return;
    setSavingOrder(true);
    try {
      const orderedIds = mergeTabOrder(types, reorderDraft);
      const rows = await staffApi.appointmentTypes.reorder(orderedIds);
      setTypes(rows.map(mapAppointmentType));
      setReordering(false);
      setReorderDraft([]);
      toastSuccess("Appointment type order saved");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not save the new order — please try again.");
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <div className={`w-full min-w-0 ${embedded ? "" : "px-4 sm:px-6 py-5"} space-y-2`}>
      {embedded ? (
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Appointment types</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage appointments shown in your online booking form and separate them for new vs. existing patients.
          </p>
        </div>
      ) : (
        <AppointmentTypesHeader
          onMappingRules={() => setView("mapping")}
          onPreview={() => setPreviewing(true)}
        />
      )}

      <div className="bg-white rounded-xl border border-border overflow-visible">
        {!embedded && (
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-border">
            <button
              onClick={() => setView("availability")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Availability
            </button>
            <button
              onClick={() => setView("fields")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Form fields
            </button>
            <button
              onClick={() => setView("insurance")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Insurance
            </button>
            <button
              onClick={() => setView("links")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Links
            </button>
            <button
              onClick={() => setView("google")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Google
            </button>
            <button
              onClick={() => setView("oneclick")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              1-Click Booking
            </button>
        </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Separate appointment types by patient type</p>
            <p className="text-xs text-gray-500 mt-0.5">
              During online booking, patients can choose if they are a new or existing patient.
            </p>
          </div>
          <Toggle on={separateByType} onChange={handleSeparateByTypeChange} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 border border-gray-200 rounded-lg">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 min-w-0 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
            />
          </div>
          <button
            onClick={() => setCopyingTypes(true)}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors whitespace-nowrap"
          >
            Copy to locations
          </button>
          <button
            onClick={() => setBulkEditing(true)}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors whitespace-nowrap"
          >
            Bulk edit
          </button>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> Add appointment type
          </button>
        </div>

        <div className="flex items-center gap-1 px-4 sm:px-5 pt-4 overflow-x-auto">
          {(["new", "existing", "unavailable"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
                tab === t ? "bg-[#444446] text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {TAB_META[t].label}
            </button>
          ))}
        </div>

        <div className="px-4 sm:px-5 py-4">
          <div className="bg-[#f5f5f5] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{meta.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{meta.description}</p>
              </div>
              {reordering ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={saveReorder}
                    disabled={savingOrder}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
                  >
                    {savingOrder ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={cancelReorder}
                    disabled={savingOrder}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                tabbed.length > 1 && (
                  <button
                    onClick={startReorder}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors flex-shrink-0"
                  >
                    Reorder
                  </button>
                )
              )}
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
            ) : displayList.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No appointment types here yet.</p>
            ) : (
              <div className="space-y-2">
                {displayList.map((t, idx) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-lg border border-gray-200/80 shadow-sm"
                  >
                    {reordering ? (
                      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <span className="text-sm font-medium text-teal-700 truncate">{t.name}</span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-gray-500 hidden sm:inline">
                            {t.insertionRules.length} rule{t.insertionRules.length !== 1 ? "s" : ""} ·{" "}
                            {t.durationMinutes} minutes
                          </span>
                          <div className="flex items-center gap-1">
                            <IconButton
                              label="Move up"
                              onClick={() => moveInReorder(idx, -1)}
                              disabled={idx === 0}
                              className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                            >
                              <ArrowUp size={13} />
                            </IconButton>
                            <IconButton
                              label="Move down"
                              onClick={() => moveInReorder(idx, 1)}
                              disabled={idx === displayList.length - 1}
                              className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                            >
                              <ArrowDown size={13} />
                            </IconButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing(t)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors text-left rounded-lg"
                      >
                        <span className="text-sm font-medium text-teal-700 truncate">{t.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {t.insertionRules.length} rule{t.insertionRules.length !== 1 ? "s" : ""} ·{" "}
                          {t.durationMinutes} minutes
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-4 border-t border-border">
          <div className="min-w-0 sm:max-w-md">
            <p className="text-sm font-semibold text-gray-900">Allow cancellations for unmapped appointments</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Patients can cancel appointments booked in your health record system that are not mapped to appointment
              types created in NexHealth.
            </p>
          </div>
          <Toggle
            on={allowCancelUnmapped}
            onChange={(v) => toggleLocationSetting("allow_cancellations_for_unmapped", v)}
          />
        </div>
      </div>

      {editing && (
        <AppointmentTypeModal
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          onDeleted={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {previewing && <PreviewBookingModal types={types} onClose={() => setPreviewing(false)} />}

      {bulkEditing && (
        <BulkEditPatientTypeModal
          locations={locations}
          onClose={() => setBulkEditing(false)}
          onSaved={() => {
            setBulkEditing(false);
            refresh();
          }}
        />
      )}

      {copyingTypes && (
        <CopyAppointmentTypesModal types={types} onClose={() => setCopyingTypes(false)} onCopied={refresh} />
      )}

      {confirmingSeparateByType && (
        <ConfirmModal
          title="Turn on new and existing choice for patient?"
          message="This will allow you to separate appointment types by new and existing patients. This change will be applied to all your locations."
          confirmLabel="Yes, separate appointment types"
          submitting={savingSeparateByType}
          onConfirm={confirmSeparateByType}
          onCancel={() => setConfirmingSeparateByType(false)}
        />
      )}
    </div>
  );
}
