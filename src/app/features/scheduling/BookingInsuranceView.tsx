import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { staffApi, mapBookingInsurance } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { BookingInsurance } from "../../types";
import { CopyInsurancesModal, RestoreDefaultInsurancesModal } from "./CopyInsurancesModal";

export function BookingInsuranceView({
  onBack,
  embedded = false,
}: {
  onBack?: () => void;
  embedded?: boolean;
}) {
  const { activeLocation, refreshSession } = useAuth();
  const [insurances, setInsurances] = useState<BookingInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const [adding, setAdding] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [deletingInsurance, setDeletingInsurance] = useState<BookingInsurance | null>(null);
  const [savingAskToggle, setSavingAskToggle] = useState(false);
  const [copyToAllLocations, setCopyToAllLocations] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const askForInsurance = activeLocation?.ask_for_insurance ?? false;

  function refresh() {
    setLoading(true);
    staffApi.bookingInsurances
      .list()
      .then((rows) => setInsurances(rows.map(mapBookingInsurance)))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function toggleAskForInsurance(value: boolean) {
    if (!activeLocation || savingAskToggle) return;
    setSavingAskToggle(true);
    try {
      await practiceApi.updateLocation(activeLocation.id, { ask_for_insurance: value });
      await refreshSession();
      toastSuccess(`Ask for insurance turned ${value ? "on" : "off"}`);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update this setting — please try again.");
    } finally {
      setSavingAskToggle(false);
    }
  }

  async function handleAddInsurances() {
    const names = pasteText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    await addInsuranceNames(names);
    setPasteText("");
  }

  async function addInsuranceNames(names: string[]) {
    if (names.length === 0 || adding) return;
    setAdding(true);
    try {
      await staffApi.bookingInsurances.bulkCreate(names, copyToAllLocations);
      toastSuccess("Insurance(s) added");
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not add these insurances — please try again.");
    } finally {
      setAdding(false);
    }
  }

  function handleCsvFile(file: File | null) {
    if (!file) return;
    setCsvError(null);
    file
      .text()
      .then((text) => {
        const names = text
          .split(/\r?\n/)
          .map((line) => line.split(",")[0]?.trim().replace(/^"|"$/g, ""))
          .filter((name): name is string => Boolean(name));
        if (names.length === 0) {
          setCsvError("No insurance names found in that file.");
          return;
        }
        addInsuranceNames(names);
      })
      .catch(() => setCsvError("Could not read that file — please try again."));
  }

  async function handleDelete() {
    if (!deletingInsurance) return;
    try {
      await staffApi.bookingInsurances.delete(deletingInsurance.id);
      toastSuccess("Insurance removed");
      setDeletingInsurance(null);
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not remove this insurance — please try again.");
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";

  const rootCls = embedded ? "space-y-5" : "w-full min-w-0 px-4 sm:px-6 py-5 space-y-5";

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
        <h1 className="text-2xl font-bold text-gray-900">Insurance</h1>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border bg-gray-50">
          <p className="text-sm text-gray-600">Copy to other locations</p>
          <button
            onClick={() => setShowCopyModal(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            Copy <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Ask for insurance</p>
            <p className="text-xs text-gray-500 mt-0.5">Patients can choose an insurance from a list during online booking.</p>
          </div>
          <Toggle on={askForInsurance} onChange={toggleAskForInsurance} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold text-gray-600">Insurances ({insurances.length})</p>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="text-xs font-medium text-teal-600 hover:text-teal-700"
          >
            Restore default
          </button>
        </div>
        <div className="px-4 sm:px-5 py-3.5 border-b border-border space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 py-2">Loading…</p>
          ) : insurances.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No insurances added yet.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {insurances.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-gray-800 truncate">{i.name}</span>
                  <IconButton label="Delete" onClick={() => setDeletingInsurance(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3.5 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Add insurance</p>
          <textarea
            className={`${inputCls} min-h-[80px]`}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Type insurance names, separated by commas or new lines"
          />
          <div className="flex items-center gap-4">
            <button
              onClick={handleAddInsurances}
              disabled={adding || !pasteText.trim()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {adding ? "Adding…" : "+ Add insurance"}
            </button>
            <label className="text-sm font-medium text-teal-600 hover:text-teal-700 cursor-pointer">
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <label className="flex items-center justify-between cursor-pointer pt-1">
            <span className="text-sm text-gray-700">Copy to all locations</span>
            <Toggle on={copyToAllLocations} onChange={setCopyToAllLocations} />
          </label>
          {csvError && <p className="text-xs text-red-600">{csvError}</p>}
        </div>
      </div>

      {deletingInsurance && (
        <ConfirmModal
          title="Remove this insurance?"
          message={`"${deletingInsurance.name}" will no longer be selectable during online booking. This can't be undone.`}
          confirmLabel="Remove"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingInsurance(null)}
        />
      )}

      {showCopyModal && (
        <CopyInsurancesModal onClose={() => setShowCopyModal(false)} onCopied={refresh} />
      )}

      {showRestoreModal && (
        <RestoreDefaultInsurancesModal
          onClose={() => setShowRestoreModal(false)}
          onRestored={refresh}
        />
      )}
    </div>
  );
}
