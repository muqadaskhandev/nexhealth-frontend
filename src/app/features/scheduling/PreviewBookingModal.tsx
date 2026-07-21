import { useState } from "react";
import { X } from "lucide-react";
import type { AppointmentType } from "../../types";

type PatientKind = "new" | "existing";

export function PreviewBookingModal({ types, onClose }: { types: AppointmentType[]; onClose: () => void }) {
  const [kind, setKind] = useState<PatientKind>("new");

  const visible = types.filter((t) => {
    if (!t.availableOnline) return false;
    return kind === "new" ? t.patientType === "new" || t.patientType === "all" : t.patientType === "existing" || t.patientType === "all";
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Preview online booking</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-2 flex-shrink-0">
          <p className="text-sm text-gray-500 mb-3">See which appointment types patients can choose from, depending on whether they say they're new or returning.</p>
          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {(["new", "existing"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  kind === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {k === "new" ? "New patient" : "Returning patient"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-2 flex-1">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No appointment types are available to {kind === "new" ? "new" : "returning"} patients online right now.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {visible.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{t.durationMinutes} minutes</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
