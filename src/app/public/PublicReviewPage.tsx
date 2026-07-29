import { useEffect, useState } from "react";

type ReviewInfo = {
  appointment_id: string;
  patient_name: string;
  location_name: string;
  provider_name: string;
  google_min_rating: number;
  google_review_url: string;
  already_rated: boolean;
  prior_rating: number | null;
  prior_google_prompted: boolean;
  reviews_enabled: boolean;
  note: string;
};

type SubmitResult = {
  status: string;
  rating: number;
  message: string;
  google_review_url: string | null;
  patient_name: string;
  location_name: string;
};

async function apiGet(path: string) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed");
  }
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(path, {
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

export function PublicReviewPage({ appointmentId }: { appointmentId: string }) {
  const [info, setInfo] = useState<ReviewInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"rate" | "feedback">("rate");

  useEffect(() => {
    apiGet(`/api/public/reviews/${appointmentId}`)
      .then((row) => setInfo(row))
      .catch((err: Error) => setError(err.message || "Appointment not found"));
  }, [appointmentId]);

  async function submit(finalRating: number, finalFeedback = "") {
    setBusy(true);
    setError(null);
    try {
      const row = (await apiPost(`/api/public/reviews/${appointmentId}`, {
        rating: finalRating,
        feedback: finalFeedback,
      })) as SubmitResult;
      setResult(row);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not submit rating");
    } finally {
      setBusy(false);
    }
  }

  function onPickRating(n: number) {
    setRating(n);
    if (info && n >= (info.google_min_rating || 4)) {
      void submit(n);
    } else {
      setStep("feedback");
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
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!info.reviews_enabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
          <p className="text-sm text-gray-600">Reviews are turned off for this appointment.</p>
        </div>
      </div>
    );
  }

  if (result?.status === "google_prompt") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8 text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-bold text-gray-900">Thanks for choosing us</h1>
          <p className="text-sm text-gray-600">
            We appreciate you taking the time to rate your experience. We&apos;d love if you left a
            review on Google.
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 text-left">
            Reviewers do NOT need a Gmail account, but they DO need to be logged into Google.
          </div>
          {result.google_review_url && (
            <a
              href={result.google_review_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold"
            >
              Leave a review on Google
            </a>
          )}
          <p className="text-[11px] text-gray-400">{info.note}</p>
        </div>
      </div>
    );
  }

  if (result?.status === "feedback") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Thank you</h1>
          <p className="text-sm text-gray-600">{result.message}</p>
          <p className="text-xs text-gray-400">
            Your feedback stays in NexHealth — it is not posted to Google.
          </p>
        </div>
      </div>
    );
  }

  if (info.already_rated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-gray-900">You already rated this visit</h1>
          <p className="text-sm text-gray-600">
            Rating: {info.prior_rating}/5
            {info.prior_google_prompted ? " · Google review prompted" : " · Internal feedback"}
          </p>
          {info.prior_google_prompted && (
            <a
              href={info.google_review_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-sky-600 hover:underline"
            >
              Leave a review on Google
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 mb-1">
            {info.location_name}
          </p>
          <h1 className="text-xl font-bold text-gray-900">
            {step === "rate" ? "How was your visit?" : "Tell us what you think"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === "rate"
              ? `Hi ${info.patient_name}, reply from 1 to 5, with 5 being the best.`
              : "How was your experience? Please comment on your visit."}
          </p>
        </div>

        {step === "rate" && (
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => onPickRating(n)}
                className={`w-12 h-12 rounded-full border text-lg font-semibold transition-colors ${
                  rating === n
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-700 border-gray-200 hover:border-teal-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {step === "feedback" && (
          <div className="space-y-3">
            <div className="flex justify-center gap-1 text-amber-400 text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n}>{n <= (rating || 0) ? "★" : "☆"}</span>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Please comment on your visit, things we could change, new services you would like to see."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
            />
            <button
              type="button"
              disabled={busy || !rating}
              onClick={() => rating && void submit(rating, feedback)}
              className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Sending…" : "Leave feedback"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 text-center">{error}</p>}

        <p className="text-[11px] text-center text-gray-400">
          Powered by NexHealth · {info.note}
        </p>
      </div>
    </div>
  );
}
