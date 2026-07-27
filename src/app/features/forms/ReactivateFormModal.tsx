import { useState } from "react";
import { X, FileText } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormRequestBatch } from "../../types";

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDueDate(amount: number, unit: string): string {
  const d = new Date();
  if (unit === "weeks") d.setDate(d.getDate() + amount * 7);
  else if (unit === "months") d.setDate(d.getDate() + amount * 30);
  else d.setDate(d.getDate() + amount);
  return toDatetimeLocal(d);
}

export function ReactivateFormModal({
  batch,
  onClose,
  onReactivated,
}: {
  batch: FormRequestBatch;
  onClose: () => void;
  onReactivated: () => void;
}) {
  const { activeLocation } = useAuth();
  const [dueDate, setDueDate] = useState(
    defaultDueDate(activeLocation?.form_expiration_amount ?? 7, activeLocation?.form_expiration_unit ?? "days")
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (submitting) return;
    setError(null);
    if (!dueDate) {
      setError("Set a due date.");
      return;
    }
    if (new Date(dueDate) <= new Date()) {
      setError("Due date must be in the future.");
      return;
    }
    setSubmitting(true);
    try {
      await staffApi.forms.requests.reactivate(batch.requestIds, new Date(dueDate).toISOString());
      toastSuccess(`Moved ${batch.patientName}'s form request back to active`);
      onReactivated();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not reactivate this form request — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-gray-900">Move to active</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><X size={15} /></IconButton>
        </div>

        <div className="px-6 pb-2 space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-900">{batch.patientName}</p>
            <div className="mt-1.5 space-y-1">
              {batch.forms.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">New due date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">The request expires 12 hours after this due date.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 mt-2">
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : "Save and move"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
