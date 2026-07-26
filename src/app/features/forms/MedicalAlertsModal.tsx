import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Edit, EyeOff, Plus, Trash2, X, Zap } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { staffApi, mapMedicalAlert } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { MedicalAlert, MedicalAlertCategory } from "../../types";

const CATEGORY_LABELS: Record<MedicalAlertCategory, string> = {
  condition: "Conditions",
  allergy: "Allergies",
  medication: "Medications",
};
const CATEGORIES: MedicalAlertCategory[] = ["condition", "allergy", "medication"];

function isQuotedLabel(label: string): boolean {
  const trimmed = label.trim();
  return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
}

export function MedicalAlertsModal({ onClose }: { onClose: () => void }) {
  const [alerts, setAlerts] = useState<MedicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<MedicalAlertCategory, string>>({ condition: "", allergy: "", medication: "" });
  const [draftFlash, setDraftFlash] = useState<Record<MedicalAlertCategory, boolean>>({ condition: false, allergy: false, medication: false });
  const [draftSnomed, setDraftSnomed] = useState<Record<MedicalAlertCategory, string>>({ condition: "", allergy: "", medication: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState<MedicalAlertCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingSnomed, setEditingSnomed] = useState("");
  const [deleting, setDeleting] = useState<MedicalAlert | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

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
      .create({ category, label, flash: draftFlash[category], snomed_code: draftSnomed[category].trim() || null })
      .then((created) => {
        setAlerts((prev) => [...prev, mapMedicalAlert(created)]);
        setDrafts((prev) => ({ ...prev, [category]: "" }));
        setDraftFlash((prev) => ({ ...prev, [category]: false }));
        setDraftSnomed((prev) => ({ ...prev, [category]: "" }));
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

  function startEditing(alert: MedicalAlert) {
    setEditingId(alert.id);
    setEditingLabel(alert.label);
    setEditingSnomed(alert.snomedCode ?? "");
  }

  function saveEditing(alert: MedicalAlert) {
    const label = editingLabel.trim();
    if (!label) {
      toastError("Label is required.");
      return;
    }
    setBusyId(alert.id);
    staffApi.medicalAlerts
      .update(alert.id, { label, snomed_code: editingSnomed.trim() || null })
      .then((updated) => {
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? mapMedicalAlert(updated) : a)));
        setEditingId(null);
        toastSuccess("Alert updated");
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not update this alert — please try again.");
      })
      .finally(() => setBusyId(null));
  }

  function handleMove(alert: MedicalAlert, direction: "up" | "down") {
    setBusyId(alert.id);
    staffApi.medicalAlerts
      .move(alert.id, direction)
      .then(refresh)
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not reorder this alert — please try again.");
      })
      .finally(() => setBusyId(null));
  }

  function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    staffApi.medicalAlerts
      .delete(deleting.id)
      .then(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== deleting.id));
        toastSuccess(`Deleted "${deleting.label}"`);
        setDeleting(null);
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not delete this alert — please try again.");
      })
      .finally(() => setDeletingBusy(false));
  }

  return (
    <>
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
              const items = alerts.filter((a) => a.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <div key={category}>
                  <p className="text-sm font-bold text-gray-900 mb-2">{CATEGORY_LABELS[category]}</p>
                  <div className="space-y-1 mb-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400">No {CATEGORY_LABELS[category].toLowerCase()} yet.</p>
                    ) : (
                      items.map((alert, i) => (
                        <div key={alert.id} className="flex items-center gap-1.5 px-1 py-1 rounded-lg hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <IconButton
                              label="Move up"
                              onClick={() => handleMove(alert, "up")}
                              disabled={i === 0 || busyId === alert.id}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp size={13} />
                            </IconButton>
                            <IconButton
                              label="Move down"
                              onClick={() => handleMove(alert, "down")}
                              disabled={i === items.length - 1 || busyId === alert.id}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown size={13} />
                            </IconButton>
                          </div>

                          {editingId === alert.id ? (
                            <>
                              <input
                                value={editingLabel}
                                onChange={(e) => setEditingLabel(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditing(alert); if (e.key === "Escape") setEditingId(null); }}
                                autoFocus
                                className="flex-1 min-w-0 px-2 py-1 border border-teal-400 rounded-md text-sm text-gray-800 outline-none"
                              />
                              <input
                                value={editingSnomed}
                                onChange={(e) => setEditingSnomed(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditing(alert); if (e.key === "Escape") setEditingId(null); }}
                                placeholder="SNOMED CT code"
                                className="w-28 flex-shrink-0 px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-700 outline-none focus:border-teal-400"
                              />
                              <button onClick={() => saveEditing(alert)} className="text-xs font-semibold text-teal-600 hover:text-teal-700 px-1.5 flex-shrink-0">Save</button>
                              <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1 flex-shrink-0">Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className={`flex-1 min-w-0 truncate text-sm flex items-center gap-1.5 ${alert.active ? "text-gray-800" : "text-gray-400 line-through"}`}>
                                {alert.label}
                                {alert.flash && <Zap size={11} className="text-amber-500 flex-shrink-0" />}
                                {alert.snomedCode && <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{alert.snomedCode}</span>}
                                {isQuotedLabel(alert.label) && (
                                  <IconButton
                                    label="Quoted alerts are treated as internal notes — they won't appear on patient forms"
                                    onClick={() => {}}
                                    className="text-gray-300 flex-shrink-0"
                                  >
                                    <EyeOff size={11} />
                                  </IconButton>
                                )}
                              </span>
                              <IconButton label="Rename" onClick={() => startEditing(alert)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100">
                                <Edit size={13} />
                              </IconButton>
                              <IconButton label="Delete" onClick={() => setDeleting(alert)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100">
                                <Trash2 size={13} />
                              </IconButton>
                              <input
                                type="checkbox"
                                checked={alert.active}
                                disabled={busyId === alert.id}
                                onChange={() => handleToggleActive(alert)}
                                className="accent-teal-500 flex-shrink-0"
                              />
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      value={drafts[category]}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(category); }}
                      placeholder={`Add a new ${CATEGORY_LABELS[category].toLowerCase().slice(0, -1)}…`}
                      className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400"
                    />
                    <input
                      value={draftSnomed[category]}
                      onChange={(e) => setDraftSnomed((prev) => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAdd(category); }}
                      placeholder="SNOMED CT code (optional)"
                      className="w-40 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-teal-400"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={draftFlash[category]}
                        onChange={(e) => setDraftFlash((prev) => ({ ...prev, [category]: e.target.checked }))}
                        className="accent-amber-500"
                      />
                      <Zap size={11} className="text-amber-500" /> Flash Alert
                    </label>
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
            Unchecking an item hides it from patients without deleting its history. Flash-alert items (
            <Zap size={10} className="inline text-amber-500" />) are flagged for staff as clinically significant. Real
            NexHealth reads this list directly from your health record system — here, this is the practice-managed
            equivalent.
          </p>
        </div>
      </div>
    </div>
    {deleting && (
      <ConfirmModal
        title="Delete this medical alert?"
        message={`"${deleting.label}" will be permanently removed from the catalog. Past submissions that reference it are not affected.`}
        confirmLabel="Yes, delete"
        danger
        submitting={deletingBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    )}
    </>
  );
}
