import { useState } from "react";
import { ArrowLeft, MapPinned } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { toastError, toastSuccess } from "../../lib/toast";

const UNITS = [
  { value: "days", label: "days after" },
  { value: "weeks", label: "weeks after" },
  { value: "months", label: "months after" },
];

export function FormsSettingsView({ onBack }: { onBack: () => void }) {
  const { user, activeLocation, refreshSession } = useAuth();
  const isAdmin = user?.role === "admin";

  const [amount, setAmount] = useState(activeLocation?.form_expiration_amount ?? 7);
  const [unit, setUnit] = useState(activeLocation?.form_expiration_unit ?? "days");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    </div>
  );
}
