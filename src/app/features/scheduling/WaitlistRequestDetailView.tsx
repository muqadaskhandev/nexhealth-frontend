import { useEffect, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { staffApi, mapWaitlistRequest } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { WaitlistRequest, WaitlistRequestSlot } from "../../types";

const EXPIRY_BUFFER_MINUTES = 15;

function slotStatus(slot: WaitlistRequestSlot, patientName: (id: string) => string): { label: string; cls: string } {
  if (slot.claimedByPatientId) {
    return { label: `Claimed by ${patientName(slot.claimedByPatientId)}`, cls: "bg-teal-50 text-teal-700 border-teal-200" };
  }
  const expiresAt = new Date(slot.startsAt).getTime() - EXPIRY_BUFFER_MINUTES * 60 * 1000;
  if (Date.now() > expiresAt) {
    return { label: "Expired", cls: "bg-gray-100 text-gray-500 border-gray-200" };
  }
  return { label: "Open", cls: "bg-amber-50 text-amber-700 border-amber-200" };
}

export function WaitlistRequestDetailView({
  requestId,
  onBack,
  onChanged,
}: {
  requestId: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [request, setRequest] = useState<WaitlistRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingSlotId, setClaimingSlotId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function refresh() {
    setLoading(true);
    staffApi.waitlistRequests
      .get(requestId)
      .then((r) => setRequest(mapWaitlistRequest(r)))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, [requestId]);

  function patientName(patientId: string): string {
    return request?.patients.find((p) => p.patientId === patientId)?.name ?? "a patient";
  }

  async function claim(patientId: string) {
    if (!request || !claimingSlotId) return;
    setClaiming(true);
    try {
      const updated = await staffApi.waitlistRequests.claimSlot(request.id, claimingSlotId, patientId);
      setRequest(mapWaitlistRequest(updated));
      toastSuccess("Slot claimed — appointment created");
      setClaimingSlotId(null);
      onChanged();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not claim this slot — please try again.");
    } finally {
      setClaiming(false);
    }
  }

  async function cancelRequest() {
    if (!request) return;
    setCancelling(true);
    try {
      const updated = await staffApi.waitlistRequests.cancel(request.id);
      setRequest(mapWaitlistRequest(updated));
      toastSuccess("Waitlist request cancelled");
      setConfirmingCancel(false);
      onChanged();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not cancel this request — please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} /> Waitlist
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Waitlist request</h1>
      </div>

      {loading || !request ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                request.status === "cancelled"
                  ? "bg-gray-100 text-gray-500 border-gray-200"
                  : "bg-teal-50 text-teal-700 border-teal-200"
              }`}
            >
              {request.status}
            </span>
            <span className="text-xs text-gray-500">
              Sent {new Date(request.sentAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-border">
              <p className="text-sm font-semibold text-gray-900">Slots</p>
            </div>
            <div className="divide-y divide-border">
              {request.slots.map((s) => {
                const status = slotStatus(s, patientName);
                const canClaim = request.status === "sent" && !s.claimedByPatientId && status.label !== "Expired";
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">
                        {new Date(s.startsAt).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    {canClaim && (
                      <IconButton
                        label="Mark as claimed"
                        onClick={() => setClaimingSlotId(s.id)}
                        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-300 flex-shrink-0"
                      >
                        <Check size={16} />
                      </IconButton>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-border">
              <p className="text-sm font-semibold text-gray-900">Patients notified ({request.patients.length})</p>
            </div>
            <div className="divide-y divide-border">
              {request.patients.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5">
                  <span className="text-sm text-gray-700 truncate">{p.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {p.notifiedAt
                      ? new Date(p.notifiedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                      : "Not yet notified"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {request.status === "sent" && (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Cancel request
            </button>
          )}
        </>
      )}

      {claimingSlotId && request && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setClaimingSlotId(null)}
        >
          <div
            className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Who claimed this slot?</h2>
              <IconButton
                label="Close"
                onClick={() => setClaimingSlotId(null)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                <X size={16} />
              </IconButton>
            </div>
            <div className="overflow-y-auto px-6 pb-6 flex-1 space-y-1.5">
              {request.patients.filter((p) => !request.slots.some((s) => s.claimedByPatientId === p.patientId)).length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Every added patient already has a claimed slot.</p>
              ) : (
                request.patients
                  .filter((p) => !request.slots.some((s) => s.claimedByPatientId === p.patientId))
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => claim(p.patientId)}
                      disabled={claiming}
                      className="w-full text-left px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-teal-300 hover:bg-teal-50 transition-colors disabled:opacity-50"
                    >
                      {p.name}
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {confirmingCancel && (
        <ConfirmModal
          title="Cancel this waitlist request?"
          message="Patients who haven't claimed a slot yet will no longer be able to book from this request."
          confirmLabel="Yes, cancel request"
          danger
          submitting={cancelling}
          onConfirm={cancelRequest}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}
    </div>
  );
}
