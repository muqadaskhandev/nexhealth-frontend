import { Sparkles, X } from "lucide-react";
import type { ApiAppointmentChatTurn } from "../../lib/staff-api";

export function BookingChatModal({
  patientName,
  turns,
  onClose,
}: {
  patientName: string;
  turns: ApiAppointmentChatTurn[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900">Chat intake</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{patientName} · Appointment booking</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {turns.length === 0 ? (
            <p className="text-sm text-gray-500">No chat record for this booking.</p>
          ) : (
            turns.map((turn, i) => (
              <div key={`${turn.role}-${i}`} className={`flex ${turn.role === "patient" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    turn.role === "patient" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5 opacity-70">
                    {turn.role === "patient" ? "Patient" : "Angelina"}
                  </p>
                  {turn.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
