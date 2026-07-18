import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { authApi } from "../lib/api";
import { BrandLogo } from "../components/branding/BrandLogo";

export function Totp2faPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txParam = params.get("tx");
    if (!txParam) {
      setIsValid(false);
      setError("Invalid 2FA session. Please try logging in again.");
    } else {
      setTx(txParam);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }
    if (!tx) {
      setError("Invalid session. Please try logging in again.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await authApi.totpVerify(code, tx);
      // Successful verification - redirect to home
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.detail || "Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isValid) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <BrandLogo className="w-[180px] h-auto object-contain mb-4" alt="NexHealth" />
            <h2 className="text-xl font-bold text-gray-900">Authentication Failed</h2>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-100">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={() => { window.location.href = "/login"; }}
            className="w-full mt-6 py-3.5 rounded-lg text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: "#2dd4bf" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#14b8a6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#2dd4bf";
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Left panel (same as login) ── */}
      <div
        className="w-[48%] flex-shrink-0 flex flex-col justify-between p-14"
        style={{ backgroundColor: "#eae6e1" }}
      >
        <div />
        <div className="max-w-sm">
          <h1 className="text-4xl leading-tight mb-4" style={{ fontFamily: "'Georgia', serif" }}>
            <span className="font-black text-gray-900">Two-factor</span>{" "}
            <span className="font-black text-gray-900">authentication</span>{" "}
            <span className="font-normal text-gray-700">keeps your account secure</span>
          </h1>
          <p className="text-sm text-gray-500">
            Open your authenticator app and enter the 6-digit code to continue.
          </p>
        </div>
        <div />
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center px-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <BrandLogo className="w-[180px] h-auto object-contain mb-4" alt="NexHealth" />
            <h2 className="text-xl font-bold text-gray-900">Enter authentication code</h2>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Authentication code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-center tracking-widest font-mono text-lg"
                placeholder="000000"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                From Google Authenticator, Authy, or similar app
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full py-3.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#2dd4bf" }}
              onMouseEnter={(e) => {
                if (!submitting && code.length === 6) e.currentTarget.style.backgroundColor = "#14b8a6";
              }}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2dd4bf")}
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = "/login"; }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to login
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-10">
            © 2026 NexHealth • The Patient Experience Platform
          </p>
        </div>
      </div>
    </div>
  );
}
