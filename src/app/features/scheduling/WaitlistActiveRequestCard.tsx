import { useState } from "react";
import { Ban, RefreshCw } from "lucide-react";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { WaitlistRequest } from "../../types";
import { formatSentAt, formatSlotTime, slotDisplayStatus } from "./waitlistRequestUtils";

function ProviderChip({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
        {initials || "?"}
      </div>
      <span className="text-sm text-gray-800 truncate">{name || "Unknown provider"}</span>
    </div>
  );
}

export function WaitlistActiveRequestCard({
  request,
  onChanged,
  onManage,
  completed = false,
}: {
  request: WaitlistRequest;
  onChanged: () => void;
  onManage?: () => void;
  completed?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmingCancelRequest, setConfirmingCancelRequest] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [cancellingSlotId, setCancellingSlotId] = useState<string | null>(null);
  const [cancellingSlot, setCancellingSlot] = useState(false);

  function patientName(patientId: string): string {
    return request.patients.find((p) => p.patientId === patientId)?.name ?? "a patient";
  }

  const recipientCount = request.patients.length;
  const slotLabel = `${request.slots.length} slot${request.slots.length !== 1 ? "s" : ""}`;
  const recipientLabel = `${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`;
  const canCancelRequest = !completed && request.status === "sent";

  async function cancelRequest() {
    setCancellingRequest(true);
    try {
      await staffApi.waitlistRequests.cancel(request.id);
      toastSuccess("Waitlist request cancelled");
      setConfirmingCancelRequest(false);
      onChanged();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not cancel this request — please try again.");
    } finally {
      setCancellingRequest(false);
    }
  }

  async function cancelSlot() {
    if (!cancellingSlotId) return;
    setCancellingSlot(true);
    try {
      await staffApi.waitlistRequests.cancelSlot(request.id, cancellingSlotId);
      toastSuccess("Slot cancelled — it's no longer bookable from this request");
      setCancellingSlotId(null);
      onChanged();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not cancel this slot — please try again.");
    } finally {
      setCancellingSlot(false);
    }
  }

  return (
    <>
      <div className="px-4 sm:px-5 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">
              {completed ? "Completed request" : "Active request"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {slotLabel} • {recipientLabel} • Sent at {formatSentAt(request.sentAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
            {canCancelRequest && (
              <button
                type="button"
                onClick={() => setConfirmingCancelRequest(true)}
                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel request
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-900 mb-2">Appointment slots</p>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-[2rem_1fr_1fr_auto_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-border text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span />
              <span>Date & time</span>
              <span>Provider</span>
              <span>Status</span>
              <span className="w-8" />
            </div>
            <div className="divide-y divide-border">
              {request.slots.map((slot, index) => {
                const status = slotDisplayStatus(slot, patientName);
                const canCancelSlot =
                  canCancelRequest && !slot.claimedByPatientId && !slot.cancelledAt && status.active;

                return (
                  <div
                    key={slot.id}
                    className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3"
                  >
                    <span className="text-sm text-gray-400">{index + 1}</span>
                    <p className="text-sm text-gray-800">{formatSlotTime(slot.startsAt)}</p>
                    <div className="hidden sm:block">
                      <ProviderChip name={slot.providerName} />
                    </div>
                    <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.cls}`}
                      >
                        {status.active && <RefreshCw size={11} className="flex-shrink-0" />}
                        {status.label}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {canCancelSlot ? (
                        <IconButton
                          label="Cancel"
                          onClick={() => setCancellingSlotId(slot.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Ban size={16} />
                        </IconButton>
                      ) : (
                        <span className="w-8" />
                      )}
                    </div>
                    <div className="col-span-3 sm:hidden pl-8 -mt-1">
                      <ProviderChip name={slot.providerName} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-5 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-border flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">Recipients ({recipientCount})</p>
              {onManage && (
                <button
                  type="button"
                  onClick={onManage}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700"
                >
                  Manage request →
                </button>
              )}
            </div>
            <div className="divide-y divide-border">
              {request.patients.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-sm text-gray-700 truncate">{p.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {p.notifiedAt
                      ? new Date(p.notifiedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Not yet notified"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmingCancelRequest && (
        <ConfirmModal
          title="Cancel this waitlist request?"
          message="All remaining slots will no longer be bookable. If a patient tries to book from this request, they'll see a message that it's no longer available."
          confirmLabel="Yes, cancel request"
          danger
          submitting={cancellingRequest}
          onConfirm={cancelRequest}
          onCancel={() => setConfirmingCancelRequest(false)}
        />
      )}

      {cancellingSlotId && (
        <ConfirmModal
          title="Cancel this slot?"
          message="This time will no longer be bookable from this request. If a patient tries to select it, they'll see a message that it's no longer available. This can't be undone."
          confirmLabel="Yes, cancel slot"
          danger
          submitting={cancellingSlot}
          onConfirm={cancelSlot}
          onCancel={() => setCancellingSlotId(null)}
        />
      )}
    </>
  );
}
