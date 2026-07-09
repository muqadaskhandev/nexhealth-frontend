import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { authApi } from "../lib/api";

export function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Reset link is invalid or missing a token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      window.history.replaceState({}, "", "/");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all";

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#eae6e1] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mb-3">
            <span className="text-white text-xl font-bold" style={{ fontFamily: "serif" }}>
              n
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set a new password</h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
              Your password has been updated. You can sign in with your new password.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              Go to login <ArrowRight size={14} />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}
            {!token && (
              <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-800">
                This reset link is invalid. Request a new one from the login page.
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-12`}
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Confirm password
              </label>
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
                disabled={!token}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full py-3.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#2dd4bf" }}
            >
              {submitting ? "Please wait…" : "Reset password"}
            </button>
            <p className="text-center text-sm">
              <a href="/" className="text-teal-600 hover:text-teal-700 font-medium">
                ← Back to login
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
