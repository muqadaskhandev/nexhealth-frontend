import { useEffect, useState } from "react";

type ReminderInfo = {
  id: string;
  status: string;
  starts_at: string;
  provider_name: string;
  appointment_type: string;
  patient_name: string;
  allow_patient_cancel: boolean;
  cancel_confirm_pending: boolean;
  booking_link: string;
  forms_note: string;
};

type RespondResult = {
  status: string;
  message: string;
  booking_link: string;
  patient_name: string;
  allow_patient_cancel: boolean;
  needs_confirm?: boolean;
};

const API_BASE = "";

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed");
  }
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : "Request failed");
  }
  return res.json();
}

export function PublicReminderRespondPage({ appointmentId }: { appointmentId: string }) {
  const [info, setInfo] = useState<ReminderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RespondResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);

  useEffect(() => {
    apiGet(`/api/public/reminders/${appointmentId}`)
      .then((row) => {
        setInfo(row);
        if (row.cancel_confirm_pending) setCancelStep(2);
      })
      .catch((err: Error) => setError(err.message || "Appointment not found"));
  }, [appointmentId]);

  async function respond(action: "confirm" | "cancel", confirmCancel = false) {
    setBusy(true);
    setError(null);
    try {
      const row = (await apiPost(`/api/public/reminders/${appointmentId}/respond`, {
        action,
        confirm_cancel: confirmCancel,
      })) as RespondResult;
      if (row.status === "cancel_prompt") {
        setCancelStep(2);
        setResult(row);
      } else {
        setResult(row);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update appointment");
    } finally {
      setBusy(false);
    }
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-400">Loading appointment…</p>
      </div>
    );
  }

  const when = new Date(info.starts_at).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (result && result.status !== "cancel_prompt") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4 text-center">
          <h1 className="text-xl font-bold text-gray-900">
            {result.status === "confirmed" ? "You're confirmed" : "Appointment cancelled"}
          </h1>
          <p className="text-sm text-gray-600">{result.message}</p>
          {result.status === "cancelled" && (
            <a
              href={result.booking_link}
              className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold"
            >
              Book new appointment
            </a>
          )}
          {result.status === "confirmed" && (
            <p className="text-xs text-gray-500">
              Once you confirm, you&apos;ll be prompted with a link to complete your forms (when Smart
              Forms are configured).
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Appointment reminder</p>
          <h1 className="text-xl font-bold text-gray-900">Hi {info.patient_name.split(" ")[0] || "there"}</h1>
          <p className="text-sm text-gray-600">
            {info.appointment_type} with {info.provider_name}
          </p>
          <p className="text-sm font-medium text-gray-900">{when}</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {info.forms_note}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {cancelStep === 2 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              Patients will be prompted twice before they cancel. Confirm you want to cancel this
              appointment.
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond("cancel", true)}
              className="w-full py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Yes, cancel appointment
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond("confirm")}
              className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Keep appointment (confirm instead)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy || info.status === "cancelled"}
              onClick={() => respond("confirm")}
              className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              Confirm your appointment
            </button>
            {info.allow_patient_cancel && (
              <button
                type="button"
                disabled={busy || info.status === "cancelled"}
                onClick={() => respond("cancel", false)}
                className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Can&apos;t make it? Cancel your appointment
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          SMS replies: {info.allow_patient_cancel ? '"Y" to confirm or "N" to cancel' : '"C" to confirm'}
        </p>
      </div>
    </div>
  );
}
