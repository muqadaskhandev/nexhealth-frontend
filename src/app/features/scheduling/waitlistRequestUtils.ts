import type { WaitlistRequest, WaitlistRequestSlot } from "../../types";

export const EXPIRY_BUFFER_MINUTES = 15;

export function isSlotOpen(slot: WaitlistRequestSlot): boolean {
  if (slot.claimedByPatientId || slot.cancelledAt) return false;
  return Date.now() <= new Date(slot.startsAt).getTime() - EXPIRY_BUFFER_MINUTES * 60 * 1000;
}

export function isRequestActive(request: WaitlistRequest): boolean {
  return request.status === "sent" && request.slots.some(isSlotOpen);
}

export function slotDisplayStatus(
  slot: WaitlistRequestSlot,
  patientName: (id: string) => string,
): { label: string; cls: string; active: boolean } {
  if (slot.claimedByPatientId) {
    return {
      label: `Claimed by ${patientName(slot.claimedByPatientId)}`,
      cls: "bg-teal-50 text-teal-700 border-teal-200",
      active: false,
    };
  }
  if (slot.cancelledAt) {
    return { label: "Cancelled", cls: "bg-gray-100 text-gray-500 border-gray-200", active: false };
  }
  const expiresAt = new Date(slot.startsAt).getTime() - EXPIRY_BUFFER_MINUTES * 60 * 1000;
  if (Date.now() > expiresAt) {
    return { label: "Expired", cls: "bg-gray-100 text-gray-500 border-gray-200", active: false };
  }
  return { label: "Active", cls: "bg-blue-50 text-blue-700 border-blue-200", active: true };
}

export function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatSlotTime(startsAt: string): string {
  return new Date(startsAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
