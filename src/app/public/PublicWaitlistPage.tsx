import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { publicWaitlistApi, type PublicApiError, type PublicWaitlistInfo } from "../lib/public-waitlist-api";

function apiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as PublicApiError;
  if (typeof apiErr?.detail === "string") return apiErr.detail;
  if (typeof apiErr?.detail === "object" && apiErr.detail?.message) return apiErr.detail.message;
  return fallback;
}

function isSlotUnavailable(err: unknown): boolean {
  const apiErr = err as PublicApiError;
  return typeof apiErr?.detail === "object" && apiErr.detail?.code === "slot_unavailable";
}

export function PublicWaitlistPage({ token }: { token: string }) {
  const [info, setInfo] = useState<PublicWaitlistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  useEffect(() => {
    publicWaitlistApi
      .info(token)
      .then(setInfo)
      .catch((err: unknown) => {
        setError(apiErrorMessage(err, "This waitlist link is no longer available."));
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function claim(slotId: string) {
    if (claimingId) return;
    setSlotError(null);
    setClaimingId(slotId);
    try {
      const result = await publicWaitlistApi.claim(token, slotId);
      setDone(result.confirmation);
    } catch (err: unknown) {
      if (isSlotUnavailable(err)) {
        setSlotError("The time you have selected is no longer available.");
        publicWaitlistApi.info(token).then(setInfo).catch(() => undefined);
      } else {
        setSlotError(apiErrorMessage(err, "Could not book this time — please try another slot."));
      }
    } finally {
      setClaimingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading available times…</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-700">{error || "This link is no longer available."}</p>
          {info?.booking_redirect_slug && (
            <a
              href={`/appt/${info.booking_redirect_slug}`}
              className="inline-block mt-4 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              View other open appointments →
            </a>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <CheckCircle2 size={40} className="mx-auto text-teal-500" />
          <h1 className="text-lg font-bold text-gray-900">You&apos;re all set!</h1>
          <p className="text-sm text-gray-600">{done}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Waitlist</p>
          <h1 className="text-lg font-bold text-gray-900 mt-1">{info.practice_name}</h1>
          <p className="text-sm text-gray-500">{info.location_name}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-base font-bold text-gray-900">
            Hi {info.patient_first_name} — earlier times are available
          </h2>
          <p className="text-sm text-gray-600">Select a slot below to book with one tap. No forms needed.</p>

          {slotError && (
            <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              {slotError}
              {info.booking_redirect_slug && (
                <a href={`/appt/${info.booking_redirect_slug}`} className="block mt-2 font-semibold text-teal-700">
                  View other open appointments →
                </a>
              )}
            </div>
          )}

          {info.slots.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No slots are available right now.</p>
          ) : (
            <div className="space-y-2">
              {info.slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => claim(slot.id)}
                  disabled={!!claimingId}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{slot.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {slot.provider_name}
                      {slot.operatory_name ? ` · ${slot.operatory_name}` : ""}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-3 py-1.5 bg-teal-500 text-white text-xs font-semibold rounded-lg">
                    {claimingId === slot.id ? "Booking…" : "Book now"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
