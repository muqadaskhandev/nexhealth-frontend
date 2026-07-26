import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi, mapMedicalAlert } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { MedicalAlert, MedicalAlertCategory } from "../../types";

const CATEGORY_LABELS: Record<MedicalAlertCategory, string> = {
  condition: "Conditions",
  allergy: "Allergies",
  medication: "Medications",
};
const CATEGORIES: MedicalAlertCategory[] = ["condition", "allergy", "medication"];

export function MedicalAlertsModal({ onClose }: { onClose: () => void }) {
  const [alerts, setAlerts] = useState<MedicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<MedicalAlertCategory, string>>({ condition: "", allergy: "", medication: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState<MedicalAlertCategory | null>(null);

  function refresh() {
    setLoading(true);
    staffApi.medicalAlerts
      .list()
      .then((rows) => setAlerts(rows.map(mapMedicalAlert)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  function handleAdd(category: MedicalAlertCategory) {
    const label = drafts[category].trim();
    if (!label) return;
    setAddingCategory(category);
    staffApi.medicalAlerts
      .create({ category, label })
      .then((created) => {
        setAlerts((prev) => [...prev, mapMedicalAlert(created)]);
        setDrafts((prev) => ({ ...prev, [category]: "" }));
        toastSuccess(`Added "${label}"`);
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not add this alert — please try again.");
      })
      .finally(() => setAddingCategory(null));
  }

  function handleToggleActive(alert: MedicalAlert) {
    setBusyId(alert.id);
    staffApi.medicalAlerts
      .update(alert.id, { active: !alert.active })
      .then((updated) => {
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? mapMedicalAlert(updated) : a)));
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not update this alert — please try again.");
      })
      .finally(() => setBusyId(null));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage medical alerts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tidy up the conditions, allergies, and medications patients can choose from.</p>
          </div>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0 ml-3">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-6">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : (
            CATEGORIES.map((category) => {
              const items = alerts.filter((a) => a.category === category);
              return (
                <div key={category}>
                  <p className="text-sm font-bold text-gray-900 mb-2">{CATEGORY_LABELS[category]}</p>
                  <div className="space-y-1 mb-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400">No {CATEGORY_LABELS[category].toLowerCase()} yet.</p>
                    ) : (
                      items.map((alert) => (
                        <label key={alert.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <span className={`text-sm ${alert.active ? "text-gray-800" : "text-gray-400 line-through"}`}>{alert.label}</span>
                          <input
                            type="checkbox"
                            checked={alert.active}
                            disabled={busyId === alert.id}
                            onChange={() => handleToggleActive(alert)}
                            className="accent-teal-500"
                          />
                        </label>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      value={drafts[category]}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(category); }}
                      placeholder={`Add a new ${CATEGORY_LABELS[category].toLowerCase().slice(0, -1)}…`}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
                    />
                    <button
                      onClick={() => handleAdd(category)}
                      disabled={addingCategory === category}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors whitespace-nowrap"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <p className="text-xs text-gray-400">
            Unchecking an item hides it from patients without deleting its history. Real NexHealth reads this list directly from
            your health record system — here, this is the practice-managed equivalent.
          </p>
        </div>
      </div>
    </div>
  );
}
