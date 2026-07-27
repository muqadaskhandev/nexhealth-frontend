import { useState } from "react";
import { ArrowLeft, MapPinned } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { EhrComingSoonBanner, EhrComingSoonBadge, EhrComingSoonSection } from "../../components/shared/EhrComingSoon";
import { useAuth } from "../../auth/AuthContext";
import { useEhrFeatures } from "../../hooks/useEhrFeatures";
import { practiceApi } from "../../lib/api";
import { toastError, toastSuccess } from "../../lib/toast";

const UNITS = [
  { value: "days", label: "days after" },
  { value: "weeks", label: "weeks after" },
  { value: "months", label: "months after" },
];

export function FormsSettingsView({ onBack }: { onBack: () => void }) {
  const { user, activeLocation, refreshSession } = useAuth();
  const { enabled: ehrLive, message: ehrMessage } = useEhrFeatures();
  const isAdmin = user?.role === "admin";

  const [amount, setAmount] = useState(activeLocation?.form_expiration_amount ?? 7);
  const [unit, setUnit] = useState(activeLocation?.form_expiration_unit ?? "days");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [syncMode, setSyncMode] = useState(activeLocation?.form_sync_mode ?? "automatic");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSubmitting, setSyncSubmitting] = useState(false);

  async function handleSave() {
    if (!isAdmin || !activeLocation || submitting) return;
    setError(null);
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Enter a number of 1 or more.");
      return;
    }
    setSubmitting(true);
    try {
      await practiceApi.updateLocation(activeLocation.id, {
        form_expiration_amount: amount,
        form_expiration_unit: unit,
      });
      await refreshSession();
      toastSuccess("Expiration date settings saved");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save these settings — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveSync() {
    if (!ehrLive) return;
    if (!isAdmin || !activeLocation || syncSubmitting) return;
    setSyncError(null);
    setSyncSubmitting(true);
    try {
      await practiceApi.updateLocation(activeLocation.id, { form_sync_mode: syncMode });
      await refreshSession();
      toastSuccess("Sync preferences saved");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save these settings — please try again.";
      setSyncError(msg);
      toastError(msg);
    } finally {
      setSyncSubmitting(false);
    }
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors mb-2">
        <ArrowLeft size={14} /> Forms
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Settings</h1>

      {!isAdmin && (
        <div className="mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          You need the Admin permission level for the Forms feature to change these settings.
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden max-w-2xl">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-gray-900">Expiration dates</p>
          <p className="text-xs text-gray-500 mt-0.5">Configure when patient's forms expire for manual and automated requests.</p>
        </div>

        <IconButton
          label="Not available in this demo yet"
          onClick={() => {}}
          disabled
          className="w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border text-sm text-gray-300 cursor-not-allowed"
        >
          <span className="flex items-center gap-1.5"><MapPinned size={14} /> Copy to other locations</span>
          <span>Copy</span>
        </IconButton>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4">
          <div className="min-w-0 sm:max-w-sm">
            <p className="text-sm font-semibold text-gray-900">Manual Requests</p>
            <p className="text-xs text-gray-500 mt-0.5">When creating a manual form request, set the default expiration date to</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Math.max(1, Number(e.target.value) || 1))}
              disabled={!isAdmin}
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              disabled={!isAdmin}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-5 mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
        )}

        <div className="px-4 sm:px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={!isAdmin || submitting}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden max-w-2xl mt-5">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-gray-900">Integrated Medical History forms</p>
          <p className="text-xs text-gray-500 mt-0.5">Dynamic forms that collect conditions, allergies, and medications from your health record system.</p>
        </div>
        <div className="px-4 sm:px-5 py-4 space-y-3 text-sm text-gray-600">
          <p>
            Medical alert options are managed in the form builder via <strong>Manage medical alerts</strong>. Inactive
            alerts appear greyed out and won&apos;t show to patients.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="font-semibold text-gray-900 mb-1">Dropdown format (default)</p>
              <p className="text-gray-500">Search-and-select for conditions, allergies, and medications. Patients can write in items not listed.</p>
            </div>
            <div className="px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="font-semibold text-gray-900 mb-1">Radio button format</p>
              <p className="text-gray-500">Yes/No for each alert with a &quot;Set unanswered to No&quot; shortcut and separate write-in fields.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Mark one Medical History form as <strong>Default</strong> from Manage forms. After a patient completes a
            Medical History form, subsequent requests are pre-filled with their prior answers so they only update what changed.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden max-w-2xl mt-5">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-gray-900">Automatic form sending</p>
          <p className="text-xs text-gray-500 mt-0.5">Smart form automation sends forms when patients confirm appointments.</p>
        </div>
        <div className="px-4 sm:px-5 py-4 space-y-3 text-sm text-gray-600">
          <p>Configure sending rules per form in <strong>Manage forms</strong> → open a form → toggle <strong>Send automatically</strong> in the right panel.</p>
          <div className="px-3.5 py-3 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-900 leading-relaxed">
            <p className="font-semibold mb-1">Before forms send automatically, confirm:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Your Reminders template includes the <code className="text-[11px] bg-white/70 px-1 rounded">APPOINTMENT_REGISTRATION</code> smart command.</li>
              <li>At least one form has a sending rule that matches the patient&apos;s appointment.</li>
              <li>The patient has no existing form request expiring on the same date as their appointment.</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500">
            Automated requests use the appointment date as the due date. To cancel a request when a patient completed paper forms instead, search for the patient under Forms and choose <strong>Archive</strong> from the ellipsis menu.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden max-w-2xl mt-5">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Sync Preferences
              <EhrComingSoonBadge />
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Sync completed forms automatically or manually to your health record system.</p>
          </div>
        </div>

        {!ehrLive && (
          <div className="px-4 sm:px-5 pt-4">
            <EhrComingSoonBanner
              title="Form sync to EHR coming soon"
              message={ehrMessage}
            />
          </div>
        )}

        <EhrComingSoonSection
          locked={!ehrLive}
          title="Form sync to EHR coming soon"
          message={ehrMessage}
        >

        <IconButton
          label="Not available in this demo yet"
          onClick={() => {}}
          disabled
          className="w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border text-sm text-gray-300 cursor-not-allowed"
        >
          <span className="flex items-center gap-1.5"><MapPinned size={14} /> Copy to other locations</span>
          <span>Copy</span>
        </IconButton>

        <div className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`flex flex-col gap-1 px-4 py-3 border rounded-xl cursor-pointer transition-colors ${syncMode === "automatic" ? "border-teal-400 ring-2 ring-teal-100 bg-teal-50/40" : "border-gray-200"} ${!isAdmin ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <input type="radio" name="sync-mode" checked={syncMode === "automatic"} onChange={() => setSyncMode("automatic")} disabled={!isAdmin} />
              Automatic
            </span>
            <span className="text-xs text-gray-500">Completed forms are automatically synced to your health record system.</span>
          </label>
          <label
            className={`flex flex-col gap-1 px-4 py-3 border rounded-xl cursor-pointer transition-colors ${syncMode === "manual" ? "border-teal-400 ring-2 ring-teal-100 bg-teal-50/40" : "border-gray-200"} ${!isAdmin ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <input type="radio" name="sync-mode" checked={syncMode === "manual"} onChange={() => setSyncMode("manual")} disabled={!isAdmin} />
              Manual
            </span>
            <span className="text-xs text-gray-500">Completed forms need to be manually synced to your health record system.</span>
          </label>
        </div>

        {syncMode === "manual" && (
          <div className="mx-4 sm:mx-5 mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            If you want to sync incomplete forms, you must use the <span className="font-semibold">Sync now</span> button manually.
          </div>
        )}

        {syncError && (
          <div className="mx-4 sm:mx-5 mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{syncError}</div>
        )}

        <div className="px-4 sm:px-5 pb-5">
          <button
            onClick={handleSaveSync}
            disabled={!isAdmin || syncSubmitting || !ehrLive}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {syncSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
        </EhrComingSoonSection>
      </div>
    </div>
  );
}
