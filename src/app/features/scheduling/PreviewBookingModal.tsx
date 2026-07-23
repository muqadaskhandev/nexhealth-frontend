import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { staffApi, mapBookingFormField, mapBookingInsurance } from "../../lib/staff-api";
import type { AppointmentType, BookingFormField, BookingInsurance } from "../../types";

type PatientKind = "new" | "existing";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  note: "Note",
  single_select: "Single select",
  multi_select: "Multi select",
  payment: "Payment",
};

export function PreviewBookingModal({ types, onClose }: { types: AppointmentType[]; onClose: () => void }) {
  const { activeLocation } = useAuth();
  const [kind, setKind] = useState<PatientKind>("new");
  const [fields, setFields] = useState<BookingFormField[]>([]);
  const [insurances, setInsurances] = useState<BookingInsurance[]>([]);

  useEffect(() => {
    staffApi.bookingFormFields.list().then((rows) => setFields(rows.map(mapBookingFormField)));
    staffApi.bookingInsurances.list().then((rows) => setInsurances(rows.map(mapBookingInsurance)));
  }, []);

  const visible = types.filter((t) => {
    if (!t.availableOnline) return false;
    return kind === "new" ? t.patientType === "new" || t.patientType === "all" : t.patientType === "existing" || t.patientType === "all";
  });

  const visibleFields = fields.filter((f) => f.showTo === "all" || f.showTo === kind);
  const askForInsurance = activeLocation?.ask_for_insurance ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Preview online booking</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X size={16} />
          </IconButton>
        </div>

        <div className="px-6 pb-2 flex-shrink-0">
          <p className="text-sm text-gray-500 mb-3">See what patients would see when booking online, depending on whether they say they're new or returning.</p>
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

        <div className="overflow-y-auto px-6 pb-6 pt-2 flex-1 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Appointment types</h3>
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

          {visibleFields.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-600 mb-2">Booking form questions</h3>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {visibleFields.map((f) => (
                  <div key={f.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-900">
                        {f.label}
                        {f.required && <span className="text-red-500"> *</span>}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType}</span>
                    </div>
                    {f.fieldType === "note" && f.noteText && (
                      <p className="text-xs text-gray-500 mt-1">{f.noteText}</p>
                    )}
                    {(f.fieldType === "single_select" || f.fieldType === "multi_select") && f.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {f.options.map((opt) => (
                          <span key={opt} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{opt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Insurance</h3>
            {!askForInsurance ? (
              <p className="text-sm text-gray-400">Patients aren't asked for insurance during online booking.</p>
            ) : insurances.length === 0 ? (
              <p className="text-sm text-gray-400">"Ask for insurance" is on, but no insurances have been added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {insurances.map((i) => (
                  <span key={i.id} className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-md text-xs text-teal-800">{i.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
