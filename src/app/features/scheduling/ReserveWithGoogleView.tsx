import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Copy, Info, MapPin } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { useAuth } from "../../auth/AuthContext";
import { usePractice } from "../../hooks/usePractice";
import { practiceApi } from "../../lib/api";
import { buildBookingLink } from "../../lib/public-booking-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { CopyReserveWithGoogleModal } from "./CopyReserveWithGoogleModal";

function GoogleListingPreview({ practiceName, locationName }: { practiceName: string; locationName: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 overflow-hidden">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {practiceName.slice(0, 1) || "P"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{practiceName || "Your practice"}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {locationName || "Your location"}
            </p>
            <div className="flex gap-2 mt-3">
              <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded">BOOK ONLINE</span>
              <span className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded">Directions</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-gray-400 mt-3">Preview of how patients see your listing on Google Search and Maps</p>
    </div>
  );
}

function statusLabel(status: string | undefined, enabled: boolean): { text: string; cls: string } {
  if (status === "error") return { text: "Setup error", cls: "text-red-700 bg-red-50 border-red-200" };
  if (status === "pending") return { text: "Syncing with Google…", cls: "text-blue-800 bg-blue-50 border-blue-200" };
  if (status === "active" || enabled) return { text: "Active on Google", cls: "text-teal-800 bg-teal-50 border-teal-200" };
  if (status === "removing") return { text: "Removing from Google…", cls: "text-amber-800 bg-amber-50 border-amber-200" };
  return { text: "Not connected", cls: "text-gray-600 bg-gray-50 border-gray-200" };
}

export function ReserveWithGoogleView({
  onBack,
  embedded = false,
}: {
  onBack?: () => void;
  embedded?: boolean;
}) {
  const { user, activeLocation, refreshSession } = useAuth();
  const practice = usePractice(true);
  const isAdmin = user?.role === "admin";

  const [enabled, setEnabled] = useState(activeLocation?.reserve_with_google ?? false);
  const [status, setStatus] = useState(activeLocation?.google_reserve_status ?? "inactive");
  const [statusMessage, setStatusMessage] = useState(activeLocation?.google_reserve_message ?? "");
  const [saving, setSaving] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  useEffect(() => {
    setEnabled(activeLocation?.reserve_with_google ?? false);
    setStatus(activeLocation?.google_reserve_status ?? "inactive");
    setStatusMessage(activeLocation?.google_reserve_message ?? "");
  }, [activeLocation?.reserve_with_google, activeLocation?.google_reserve_status, activeLocation?.google_reserve_message]);

  const googleBookingLink =
    practice?.name && practice?.id
      ? buildBookingLink(practice.name, practice.id, {
          utm_source: "google",
          utm_medium: "reserve_with_google",
          utm_campaign: "online_booking",
        })
      : "";

  const badge = statusLabel(status, enabled);
  const rootCls = embedded ? "space-y-5" : "w-full min-w-0 px-4 sm:px-6 py-5 space-y-5";

  async function toggleReserveWithGoogle(value: boolean) {
    if (!activeLocation || saving || !isAdmin) return;
    setSaving(true);
    const previous = { enabled, status, statusMessage };
    setEnabled(value);
    try {
      const updated = await practiceApi.updateLocation(activeLocation.id, { reserve_with_google: value });
      await refreshSession();
      setEnabled(updated.reserve_with_google ?? value);
      setStatus(updated.google_reserve_status ?? (value ? "pending" : "removing"));
      setStatusMessage(updated.google_reserve_message ?? "");
      toastSuccess(`Reserve with Google turned ${value ? "on" : "off"}`);
    } catch (err: unknown) {
      setEnabled(previous.enabled);
      setStatus(previous.status);
      setStatusMessage(previous.statusMessage);
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update this setting — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!googleBookingLink) return;
    navigator.clipboard.writeText(googleBookingLink);
    toastSuccess("Google booking link copied");
  }

  return (
    <div className={rootCls}>
      <div className="flex flex-wrap items-center gap-3">
        {!embedded && onBack && (
          <>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft size={15} /> Appointment types
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
          </>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Reserve with Google</h1>
      </div>
      <p className="text-sm text-gray-500">
        Get more patients by adding a &quot;Book Online&quot; button to your Google listing on Search and Maps.
      </p>

      {!isAdmin && (
        <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          You need the Admin permission level for Online Booking to change Reserve with Google settings.
        </div>
      )}

      <div className="px-3.5 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
        Make sure to configure your Appointment types, Providers and availability, and any customizations to your
        online booking form before activating.
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <GoogleListingPreview
          practiceName={practice?.name ?? "Your practice"}
          locationName={activeLocation?.name ?? ""}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-t border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Turn on Reserve with Google</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Automatically add a &quot;Book Online&quot; button to your Google listing.
            </p>
          </div>
          <Toggle on={enabled} onChange={toggleReserveWithGoogle} disabled={!isAdmin || saving} />
        </div>

        <div className="px-4 sm:px-5 pb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${badge.cls}`}>
            {badge.text}
          </span>
        </div>

        {(enabled || status === "pending" || status === "active") && statusMessage && status !== "error" && (
          <div className="mx-4 sm:mx-5 mb-4 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 flex gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <p>{statusMessage}</p>
          </div>
        )}

        {status === "error" && statusMessage && (
          <div className="mx-4 sm:mx-5 mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {statusMessage}
          </div>
        )}

        <div className="px-4 sm:px-5 py-3 border-t border-border text-xs text-gray-500 space-y-1">
          <p>NexHealth matches your address on file with your Google Business Profile.</p>
          <p>Google integrations are included in your subscription at no extra cost.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-border bg-gray-50">
          <p className="text-sm text-gray-600">Copy to other locations</p>
          <button
            onClick={() => setShowCopyModal(true)}
            disabled={!isAdmin}
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 disabled:text-gray-400"
          >
            Copy <ChevronRight size={14} />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 border-t border-border space-y-3">
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
            </a>
            . If you do not have access, claim and verify your listing with Google first, then follow Google&apos;s steps
            for managing local business links.
          </p>
          {googleBookingLink && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={googleBookingLink} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50" />
              <button
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
              >
                <Copy size={14} /> Copy link
              </button>
            </div>
          )}
        </div>
      </div>

      {showCopyModal && (
        <CopyReserveWithGoogleModal onClose={() => setShowCopyModal(false)} onCopied={() => refreshSession()} />
      )}
    </div>
  );
}
