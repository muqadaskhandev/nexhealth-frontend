import { Send, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";

type Props = {
  patientCount: number;
  slotCount: number;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function WaitlistSendConfirmModal({
  patientCount,
  slotCount,
  submitting = false,
  onConfirm,
  onCancel,
}: Props) {
  const patientLabel = `${patientCount} patient${patientCount !== 1 ? "s" : ""}`;
  const slotLabel = `${slotCount} slot${slotCount !== 1 ? "s" : ""}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="waitlist-send-title"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div>
            <h2 id="waitlist-send-title" className="text-xl font-bold text-gray-900 tracking-tight">
              Send to {patientLabel}?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Offering {slotLabel} via SMS with a one-tap booking link.
            </p>
          </div>
          <IconButton
            label="Close"
            onClick={onCancel}
            disabled={submitting}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 flex-shrink-0"
          >
            <X size={18} />
          </IconButton>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Once a patient accepts, an appointment is created in your schedule. Patients open their
            unique link and tap <span className="font-medium text-gray-800">Book now</span> — no form
            required.
          </p>
          <div className="rounded-xl bg-teal-50/80 border border-teal-100 px-4 py-3">
            <p className="text-sm text-teal-900 leading-relaxed">
              <span className="font-semibold">Smart Send</span> protects patients from spam. For large
              lists, requests go out in batches of 10 every 5 minutes. After a slot is claimed, only
              people who try that slot see that it was taken.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Messages are sent as SMS to the patient&apos;s phone on file (also logged in Messaging).
            Email is not sent for waitlist requests.
          </p>
        </div>

        <div className="flex items-center gap-4 px-6 py-5 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white text-sm font-semibold rounded-lg shadow-sm shadow-teal-500/20 transition-colors"
          >
            <Send size={15} />
            {submitting ? "Sending…" : "Send request now"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
