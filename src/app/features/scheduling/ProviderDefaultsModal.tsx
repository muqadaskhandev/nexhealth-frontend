import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi, mapBookingInsurance } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { AppointmentType, BookingInsurance, Provider } from "../../types";

function parseInsuranceNames(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProviderDefaultsModal({ provider, appointmentTypes, mode, onClose, onSaved }: {
  provider: Provider;
  appointmentTypes: AppointmentType[];
  mode: "types" | "insurances";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [typeIds, setTypeIds] = useState<string[]>(provider.defaultAppointmentTypeIds);
  const [durations, setDurations] = useState<Record<string, number>>(provider.appointmentTypeDurations);
  const [insurances, setInsurances] = useState<string[]>(provider.defaultInsurances);
  const [locationInsurances, setLocationInsurances] = useState<BookingInsurance[]>([]);
  const [loadingInsurances, setLoadingInsurances] = useState(mode === "insurances");
  const [pasteText, setPasteText] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "insurances") return;
    let cancelled = false;
    setLoadingInsurances(true);
    staffApi.bookingInsurances
      .list()
      .then((rows) => {
        if (!cancelled) setLocationInsurances(rows.map(mapBookingInsurance));
      })
      .catch(() => {
        if (!cancelled) setLocationInsurances([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInsurances(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function toggleType(id: string) {
    setTypeIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function setDuration(id: string, minutes: number) {
    setDurations((prev) => ({ ...prev, [id]: minutes }));
  }

  function toggleInsurance(name: string) {
    setInsurances((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  }

  function addPastedInsurances() {
    const names = parseInsuranceNames(pasteText);
    if (names.length === 0) return;
    setInsurances((prev) => Array.from(new Set([...prev, ...names])));
    setPasteText("");
  }

  function removeInsurance(name: string) {
    setInsurances((prev) => prev.filter((i) => i !== name));
  }

  function collectInsurancesForSave(): string[] {
    const pending = parseInsuranceNames(pasteText);
    return Array.from(new Set([...insurances, ...pending]));
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
        setInsurances((prev) => Array.from(new Set([...prev, ...names])));
      })
      .catch(() => setCsvError("Could not read that file — please try again."));
  }

  async function handleSave() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const body =
      mode === "types"
        ? {
            default_appointment_type_ids: typeIds,
            appointment_type_durations: Object.fromEntries(
              typeIds.filter((id) => durations[id] !== undefined).map((id) => [id, durations[id]])
            ),
          }
        : { default_insurances: collectInsurancesForSave() };
    try {
      await staffApi.providers.update(provider.id, body);
      toastSuccess(mode === "types" ? "Default appointment types updated" : "Default insurances updated");
      onSaved();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white";

  const customInsurances = insurances.filter(
    (name) => !locationInsurances.some((i) => i.name.toLowerCase() === name.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "types" ? "Default appointment types" : "Default insurances"} for {provider.name}
          </h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-shrink-0">{error}</div>
        )}

        <div className="overflow-y-auto px-6 pb-2 flex-1">
          {mode === "types" ? (
            appointmentTypes.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                Create an appointment type first, then come back to assign it to this provider.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {appointmentTypes.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <Toggle on={typeIds.includes(t.id)} onChange={() => toggleType(t.id)} />
                      <span className="text-sm text-gray-800 truncate">{t.name}</span>
                    </label>
                    {typeIds.includes(t.id) && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          type="number"
                          min={5}
                          step={5}
                          value={durations[t.id] ?? t.durationMinutes}
                          onChange={(e) => setDuration(t.id, Math.max(5, Number(e.target.value) || t.durationMinutes))}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-md text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                        />
                        <span className="text-xs text-gray-500">min</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {loadingInsurances ? (
                <p className="text-sm text-gray-400 py-2">Loading location insurances…</p>
              ) : locationInsurances.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Select from location insurances
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {locationInsurances.map((ins) => (
                      <label
                        key={ins.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                      >
                        <Toggle
                          on={insurances.includes(ins.name)}
                          onChange={() => toggleInsurance(ins.name)}
                        />
                        <span className="text-sm text-gray-800">{ins.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
                  No insurances at this location yet. Add them under Online booking → Insurance, or paste names below.
                </p>
              )}

              {customInsurances.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Custom insurances</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customInsurances.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800">
                        {name}
                        <IconButton label="Remove" onClick={() => removeInsurance(name)} className="text-teal-500 hover:text-teal-700">
                          <X size={11} />
                        </IconButton>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Add more</p>
                <textarea
                  className={`${inputCls} min-h-[80px]`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste insurance names, separated by commas or new lines"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Text in this box is included when you click Save — you don&apos;t need to click Add first.
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={addPastedInsurances}
                    disabled={!pasteText.trim()}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-300"
                  >
                    + Add to list
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
                {csvError && <p className="text-xs text-red-600 mt-1">{csvError}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
