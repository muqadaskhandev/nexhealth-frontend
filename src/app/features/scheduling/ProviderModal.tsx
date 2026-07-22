import { useState } from "react";
import { X } from "lucide-react";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { Provider } from "../../types";

const ROLE_OPTIONS = ["Dentist", "Hygienist", "Nurse Practitioner", "Physician", "Nurse", "Front Desk", "Other"];

export function ProviderModal({ initial, onClose, onSaved }: {
  initial?: Provider;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role || ROLE_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);

  const nameError = nameTouched && !name.trim() ? "Name is required." : null;

  async function handleSave() {
    if (submitting) return;
    setNameTouched(true);
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const body = { name: name.trim(), role };
    try {
      if (initial) await staffApi.providers.update(initial.id, body);
      else await staffApi.providers.create(body);
      toastSuccess(initial ? "Provider updated" : "Provider added");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save provider — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit provider" : "Add provider"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">
            {error}
          </div>
        )}

        <div className="px-6 pb-2 space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              className={`${inputCls} ${nameError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="e.g. Dr. Nick Riviera"
            />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
