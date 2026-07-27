import { useState } from "react";
import { AlertTriangle, Check, Edit, FileText, Search, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormTemplate } from "../../types";

type Step = "forms" | "locations" | "confirm";

export function CopyToLocationsModal({
  templates,
  preselectedFormId,
  onClose,
  onCopied,
}: {
  templates: FormTemplate[];
  preselectedFormId?: string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const { locations, activeLocation } = useAuth();
  const otherLocations = locations.filter((l) => l.id !== activeLocation?.id);

  const [step, setStep] = useState<Step>(preselectedFormId ? "locations" : "forms");
  const [formSearch, setFormSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(
    new Set(preselectedFormId ? [preselectedFormId] : [])
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredForms = templates.filter((t) => !formSearch || t.name.toLowerCase().includes(formSearch.toLowerCase()));
  const filteredLocations = otherLocations.filter((l) => !locationSearch || l.name.toLowerCase().includes(locationSearch.toLowerCase()));
  const selectedForms = templates.filter((t) => selectedFormIds.has(t.id));

  function toggleForm(id: string) {
    setSelectedFormIds((prev) => {
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
    if (selectedFormIds.size === 0) {
      setError("Select at least one form to copy.");
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
      const result = await staffApi.forms.copyTemplates([...selectedFormIds], [...selectedLocationIds]);
      toastSuccess(`Copied ${result.copied} form${result.copied !== 1 ? "s" : ""} to ${selectedLocationIds.size} location${selectedLocationIds.size !== 1 ? "s" : ""}`);
      onCopied();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not copy these forms — please try again.";
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
          <h2 className="text-base font-bold text-gray-900">
            {step === "forms" ? "Copy to other locations" : step === "locations" ? "Copy to other locations" : "Ready to copy forms?"}
          </h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2 space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          {step === "forms" && (
            <>
              <p className="text-sm text-gray-500">Choose which forms to copy to other locations.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Forms {selectedFormIds.size}/{templates.length}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedFormIds(new Set(templates.map((t) => t.id)))} className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">Select all</button>
                  <button onClick={() => setSelectedFormIds(new Set())} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">Deselect all</button>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input value={formSearch} onChange={(e) => setFormSearch(e.target.value)} placeholder="Search" className="flex-1 min-w-0 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
              </div>
              {filteredForms.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No forms found.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
                  {filteredForms.map((t) => (
                    <label key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                      <div
                        onClick={() => toggleForm(t.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-colors ${selectedFormIds.has(t.id) ? "bg-gray-900 border-gray-900" : "border-gray-300 bg-white"}`}
                      >
                        {selectedFormIds.has(t.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                      <FileText size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "locations" && (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5 border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">{selectedFormIds.size} form{selectedFormIds.size !== 1 ? "s" : ""}</span>
                <IconButton label="Edit selected forms" onClick={() => setStep("forms")} className="text-gray-400 hover:text-gray-700"><Edit size={14} /></IconButton>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Locations {selectedLocationIds.size}/{otherLocations.length}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedLocationIds(new Set(otherLocations.map((l) => l.id)))} className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors">Select all</button>
                  <button onClick={() => setSelectedLocationIds(new Set())} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">Deselect all</button>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} placeholder="Search" className="flex-1 min-w-0 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
              </div>
              {otherLocations.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No other locations to copy to.</p>
              ) : filteredLocations.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No locations found.</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
                  {filteredLocations.map((l) => (
                    <label key={l.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                      <div
                        onClick={() => toggleLocation(l.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-colors ${selectedLocationIds.has(l.id) ? "bg-gray-900 border-gray-900" : "border-gray-300 bg-white"}`}
                      >
                        {selectedLocationIds.has(l.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{l.name}</p>
                        {l.address && <p className="text-xs text-gray-400 truncate">{l.address}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "confirm" && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1.5">Selected forms</p>
                <ul className="space-y-1">
                  {selectedForms.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" /> {t.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1.5">Destination locations</p>
                <ul className="space-y-1">
                  {otherLocations.filter((l) => selectedLocationIds.has(l.id)).map((l) => (
                    <li key={l.id} className="text-sm text-gray-700">{l.name}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-start gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                If there are forms with the same name in a destination location, they will be replaced.
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step === "forms" && (
            <>
              <button onClick={goToLocations} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Continue</button>
              <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
            </>
          )}
          {step === "locations" && (
            <>
              <button onClick={goToConfirm} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors">Continue</button>
              <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
            </>
          )}
          {step === "confirm" && (
            <>
              <button onClick={handleConfirm} disabled={submitting} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors">
                {submitting ? "Copying…" : "Yes, copy to locations"}
              </button>
              <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
