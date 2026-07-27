import { useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { toastError, toastSuccess } from "../../lib/toast";

export function CopyReserveWithGoogleModal({ onClose, onCopied }: { onClose: () => void; onCopied: () => void }) {
  const { locations, activeLocation, refreshSession } = useAuth();
  const otherLocations = locations.filter((l) => l.id !== activeLocation?.id);

  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredLocations = otherLocations.filter(
    (l) => !locationSearch || l.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCopy() {
    if (submitting || !activeLocation) return;
    if (selectedLocationIds.size === 0) {
      setError("Select at least one destination location.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await practiceApi.copyReserveWithGoogle(activeLocation.id, [...selectedLocationIds]);
      await refreshSession();
      toastSuccess(`Copied Reserve with Google settings to ${selectedLocationIds.size} location${selectedLocationIds.size !== 1 ? "s" : ""}`);
      onCopied();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not copy this setting — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Copy to other locations</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="px-6 pb-2 flex-1 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-3">
            Apply this location&apos;s Reserve with Google on/off state to other offices.
          </p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search locations…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {otherLocations.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No other locations in this practice.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {filteredLocations.map((loc) => (
                <label key={loc.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedLocationIds.has(loc.id)}
                    onChange={() => toggleLocation(loc.id)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-800">{loc.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleCopy}
            disabled={submitting || otherLocations.length === 0}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Copying…" : "Copy"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
