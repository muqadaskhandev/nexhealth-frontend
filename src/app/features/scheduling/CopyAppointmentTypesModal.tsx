import { useState } from "react";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType } from "../../types";

type Step = "types" | "locations" | "confirm";

export function CopyAppointmentTypesModal({
  types,
  preselectedTypeId,
  onClose,
  onCopied,
}: {
  types: AppointmentType[];
  preselectedTypeId?: string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const { locations, activeLocation } = useAuth();
  const otherLocations = locations.filter((l) => l.id !== activeLocation?.id);

  const [step, setStep] = useState<Step>(preselectedTypeId ? "locations" : "types");
  const [typeSearch, setTypeSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<string>>(
    new Set(preselectedTypeId ? [preselectedTypeId] : [])
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredTypes = types.filter((t) => !typeSearch || t.name.toLowerCase().includes(typeSearch.toLowerCase()));
  const filteredLocations = otherLocations.filter((l) => !locationSearch || l.name.toLowerCase().includes(locationSearch.toLowerCase()));
  const selectedTypes = types.filter((t) => selectedTypeIds.has(t.id));

  function toggleType(id: string) {
    setSelectedTypeIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function goToLocations() {
    if (selectedTypeIds.size === 0) {
      setError("Select at least one appointment type to copy.");
      return;
    }
    setError(null);
    setStep("locations");
  }

  function goToConfirm() {
    if (selectedLocationIds.size === 0) {
      setError("Select at least one destination location.");
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await staffApi.appointmentTypes.copy([...selectedTypeIds], [...selectedLocationIds]);
      toastSuccess(
        `Copied ${result.copied} appointment type${result.copied !== 1 ? "s" : ""} to ${selectedLocationIds.size} location${selectedLocationIds.size !== 1 ? "s" : ""}`
      );
      onCopied();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not copy appointment types — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">Copy to other locations</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={15} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">
          {error && <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

          {step === "types" && (
            <>
              <p className="text-sm text-gray-500">Choose which appointment types to copy to other locations.</p>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} placeholder="Search" className="flex-1 min-w-0 outline-none text-sm bg-transparent" />
              </div>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
                {filteredTypes.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                    <div onClick={() => toggleType(t.id)} className={`w-5 h-5 rounded flex items-center justify-center border-2 ${selectedTypeIds.has(t.id) ? "bg-gray-900 border-gray-900" : "border-gray-300"}`}>
                      {selectedTypeIds.has(t.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-gray-700 truncate">{t.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === "locations" && (
            <>
              <p className="text-sm text-gray-500">{selectedTypeIds.size} appointment type{selectedTypeIds.size !== 1 ? "s" : ""} selected</p>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} placeholder="Search locations" className="flex-1 min-w-0 outline-none text-sm bg-transparent" />
              </div>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
                {filteredLocations.map((l) => (
                  <label key={l.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                    <div onClick={() => toggleLocation(l.id)} className={`w-5 h-5 rounded flex items-center justify-center border-2 ${selectedLocationIds.has(l.id) ? "bg-gray-900 border-gray-900" : "border-gray-300"}`}>
                      {selectedLocationIds.has(l.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-gray-700 truncate">{l.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Selected types</p>
                <ul className="space-y-1">
                  {selectedTypes.map((t) => (
                    <li key={t.id} className="text-sm text-gray-700">{t.name}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-start gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                Types with the same name in a destination location will be updated.
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100">
          {step === "types" && (
            <>
              <button onClick={goToLocations} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg">Continue</button>
              <button onClick={onClose} className="text-sm font-medium text-teal-600">Cancel</button>
            </>
          )}
          {step === "locations" && (
            <>
              <button onClick={goToConfirm} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg">Continue</button>
              <button onClick={onClose} className="text-sm font-medium text-teal-600">Cancel</button>
            </>
          )}
          {step === "confirm" && (
            <>
              <button onClick={handleConfirm} disabled={submitting} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white text-sm font-semibold rounded-lg">
                {submitting ? "Copying…" : "Yes, copy to locations"}
              </button>
              <button onClick={onClose} className="text-sm font-medium text-teal-600">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
