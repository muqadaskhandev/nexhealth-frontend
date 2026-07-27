import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { staffApi, mapAppointmentType } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { AppointmentTypeModal } from "./AppointmentTypeModal";
import { MappingRulesView } from "./MappingRulesView";
import { PreviewBookingModal } from "./PreviewBookingModal";
import { ProvidersAvailabilityView } from "./ProvidersAvailabilityView";
import { BookingFormFieldsView } from "./BookingFormFieldsView";
import { BookingInsuranceView } from "./BookingInsuranceView";
import { BulkEditPatientTypeModal } from "./BulkEditPatientTypeModal";
import { OnlineBookingLinksView } from "./OnlineBookingLinksView";
import { ReserveWithGoogleView } from "./ReserveWithGoogleView";
import { OneClickBookingView } from "./OneClickBookingView";
import type { AppointmentType } from "../../types";

type Tab = "new" | "existing" | "unavailable";
type View = "types" | "mapping" | "availability" | "fields" | "insurance" | "links" | "google" | "oneclick";

export function OnlineBookingSection() {
  const { activeLocation } = useAuth();
  const [view, setView] = useState<View>("types");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("new");
  const [editing, setEditing] = useState<AppointmentType | "new" | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [separateByType, setSeparateByType] = useState(activeLocation?.separate_by_patient_type ?? true);
  const [allowCancelUnmapped, setAllowCancelUnmapped] = useState(
    activeLocation?.allow_cancellations_for_unmapped ?? false
  );
  const [confirmingSeparateByType, setConfirmingSeparateByType] = useState(false);
  const [savingSeparateByType, setSavingSeparateByType] = useState(false);

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
    value: boolean
  ) {
    if (!activeLocation) return;
    const setLocal = key === "separate_by_patient_type" ? setSeparateByType : setAllowCancelUnmapped;
    const previous = !value;
    setLocal(value); // optimistic
    try {
      await practiceApi.updateLocation(activeLocation.id, { [key]: value });
      toastSuccess(
        key === "separate_by_patient_type"
          ? `Separate appointment types by patient type turned ${value ? "on" : "off"}`
          : `Cancellations for unmapped appointments turned ${value ? "on" : "off"}`
      );
    } catch (err: unknown) {
      setLocal(previous); // roll back the optimistic flip
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
    await toggleLocationSetting("separate_by_patient_type", true);
    setSavingSeparateByType(false);
    setConfirmingSeparateByType(false);
  }

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
  const tabbed = filtered.filter((t) => {
    if (tab === "unavailable") return !t.availableOnline;
    if (!t.availableOnline) return false;
    if (tab === "new") return t.patientType === "new" || t.patientType === "all";
    return t.patientType === "existing" || t.patientType === "all";
  });

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-2">
      <h1 className="text-2xl font-bold text-gray-900">Appointment types</h1>
      <p className="text-sm text-gray-500 pb-3">Manage appointments shown in your online booking form.</p>

      <div className="bg-white rounded-xl border border-border overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setView("availability")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Availability
            </button>
            <button
              onClick={() => setView("mapping")}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Mapping rules
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
          <button
            onClick={() => setPreviewing(true)}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            Preview online booking ↗
          </button>
        </div>

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

        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 overflow-x-auto">
          {(["new", "existing", "unavailable"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize flex-shrink-0 ${
                tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t === "new" ? "New patients" : t === "existing" ? "Existing patients" : "Unavailable"}
            </button>
          ))}
        </div>

        <div className="px-4 sm:px-5 pb-3 pt-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : tabbed.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No appointment types here yet.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {tabbed.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEditing(t)}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-teal-700 truncate">{t.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {t.insertionRules.length} rule{t.insertionRules.length !== 1 ? "s" : ""} · {t.durationMinutes} minutes
                  </span>
                </button>
              ))}
            </div>
          )}
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
          types={types}
          onClose={() => setBulkEditing(false)}
          onSaved={() => {
            setBulkEditing(false);
            refresh();
          }}
        />
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
