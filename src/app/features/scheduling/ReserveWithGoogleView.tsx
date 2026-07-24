import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { toastError, toastSuccess } from "../../lib/toast";

export function ReserveWithGoogleView({ onBack }: { onBack: () => void }) {
  const { user, activeLocation, locations, refreshSession } = useAuth();
  const isAdmin = user?.role === "admin";
  const [enabled, setEnabled] = useState(activeLocation?.reserve_with_google ?? false);
  const [saving, setSaving] = useState(false);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);

  const otherLocations = locations.filter((l) => l.id !== activeLocation?.id);

  async function toggleReserveWithGoogle(value: boolean) {
    if (!activeLocation || saving || !isAdmin) return;
    setSaving(true);
    const previous = enabled;
    setEnabled(value); // optimistic
    try {
      await practiceApi.updateLocation(activeLocation.id, { reserve_with_google: value });
      await refreshSession();
      toastSuccess(`Reserve with Google turned ${value ? "on" : "off"}`);
    } catch (err: unknown) {
      setEnabled(previous);
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update this setting — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggleTarget(id: string) {
    setCopyTargets((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleCopy() {
    if (!activeLocation || copyTargets.length === 0 || copying || !isAdmin) return;
    setCopying(true);
    try {
      await practiceApi.copyReserveWithGoogle(activeLocation.id, copyTargets);
      toastSuccess(`Copied to ${copyTargets.length} location${copyTargets.length !== 1 ? "s" : ""}`);
      setCopyTargets([]);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not copy this setting — please try again.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} /> Appointment types
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Reserve with Google</h1>
      </div>
      <p className="text-sm text-gray-500">Get more patients by adding a "Book Online" button to your Google listing.</p>

      {!isAdmin && (
        <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          You need the Admin permission level for Online Booking to change Reserve with Google settings.
        </div>
      )}

      <div className="px-3.5 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
        Make sure to configure your Appointment types, Providers and availability, and make any desired
        customizations to your online booking form before activating.
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Turn on Reserve with Google</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Automatically add a "Book Online" button to your Google listing. The button appears on your Google
              listings within 24 hours.
            </p>
          </div>
          <Toggle on={enabled} onChange={toggleReserveWithGoogle} disabled={!isAdmin} />
        </div>

        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
            <li>When patients search "dentist near me", they can schedule directly through a Book Now button right where they're already searching.</li>
            <li>NexHealth matches your address on file with your Google Business Profile.</li>
            <li>Google integrations are included in your NexHealth subscription at no extra cost.</li>
          </ul>
        </div>

        {enabled && (
          <div className="px-4 sm:px-5 py-3 border-b border-border bg-red-50">
            <ul className="text-xs text-red-800 list-disc pl-4 space-y-1">
              <li>If you turn this off, the online booking button should be removed from your Google listing within 24 hours.</li>
              <li>You can switch the integration back on at any time.</li>
            </ul>
          </div>
        )}

        <div className="px-4 sm:px-5 py-3.5 space-y-3 border-b border-border">
          <p className="text-xs font-semibold text-gray-600">Copy to other locations</p>
          {otherLocations.length === 0 ? (
            <p className="text-sm text-gray-400">No other locations to copy this setting to.</p>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-40 overflow-y-auto">
                {otherLocations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyTargets.includes(loc.id)}
                      onChange={() => toggleTarget(loc.id)}
                      disabled={!isAdmin}
                    />
                    <span className="truncate">{loc.name}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleCopy}
                disabled={copying || copyTargets.length === 0 || !isAdmin}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {copying ? "Copying…" : "Copy"}
              </button>
            </>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3.5 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Manually add the booking link to your Google Business page</p>
          <p className="text-xs text-gray-500">
            Access your{" "}
            <a
              href="https://www.google.com/business/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              Google Business Listing
            </a>{" "}
            and follow the steps outlined by Google to add your booking link.
          </p>
        </div>
      </div>
    </div>
  );
}
