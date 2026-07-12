import { useEffect, useState, type FormEvent } from "react";
import { invitesApi } from "../lib/api";

export function AcceptInvitePage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const [preview, setPreview] = useState<{
    email: string;
    practice_name: string;
    first_name: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link.");
      return;
    }
    invitesApi
      .preview(token)
      .then((p) =>
        setPreview({
          email: p.email,
          practice_name: p.practice_name,
          first_name: p.first_name,
        })
      )
      .catch(() => setError("This invitation is invalid or has expired."));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await invitesApi.accept(token, password);
      setDone(true);
      window.location.href = "/";
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not accept invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Accept invitation</h1>
        {preview ? (
          <p className="text-sm text-gray-600 mb-6">
            Hi {preview.first_name}, set a password to join{" "}
            <strong>{preview.practice_name}</strong> as Practice Admin.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-6">Loading invitation…</p>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}
        {done && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 text-sm text-green-700">
            Account created. Redirecting…
          </div>
        )}

        {preview && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                readOnly
                value={preview.email}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account & sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
