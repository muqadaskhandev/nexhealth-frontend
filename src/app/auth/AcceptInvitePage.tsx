import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { invitesApi } from "../lib/api";
import { toastError, toastSuccess } from "../lib/toast";
import {
  passwordStrengthError,
  passwordsMatchError,
} from "../lib/fieldFormat";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    const fieldError =
      passwordStrengthError(password, { required: true }) ||
      passwordsMatchError(password, confirm);
    if (fieldError) {
      setError(fieldError);
      toastError(fieldError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await invitesApi.accept(token, password);
      toastSuccess("Account created. Signing you in…");
      setDone(true);
      window.location.href = "/";
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not accept invitation.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 pr-11";

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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                At least 6 characters, with 1 uppercase letter, 1 number, and 1 @.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputCls}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
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
