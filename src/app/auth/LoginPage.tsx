import { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "./AuthContext";
import { authApi, ssoLoginUrl } from "../lib/api";
import { BrandLogo } from "../components/branding/BrandLogo";

const LOGIN_SLIDES = [
  {
    tag: "VERIFICATION",
    headline: ["Collect & verify", "insurance"],
    rest: "when patients fill out forms",
    sub: "Available for practices with verification and forms.",
  },
  {
    tag: "SCHEDULING",
    headline: ["Online booking", "made simple"],
    rest: "for your entire practice",
    sub: "Patients book 24/7 — no phone calls required.",
  },
  {
    tag: "FORMS",
    headline: ["Paperless intake", "forms"],
    rest: "patients love to fill out",
    sub: "Collect signatures, insurance, and more digitally.",
  },
];

export function LoginPage() {
  const { login, providers } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [slide, setSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % LOGIN_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Surface any SSO error returned via ?sso_error= on the redirect back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoErr = params.get("sso_error");
    if (ssoErr) {
      setError(decodeURIComponent(ssoErr));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleLogin() {
    if (submitting) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password, needsTotp ? totpCode : undefined);
    } catch (err: any) {
      if (err?.status === 403 && err?.detail?.includes("Two-factor")) {
        setNeedsTotp(true);
        setError(null);
      } else {
        setError(err?.detail || "Unable to log in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    if (submitting) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setNotice("If an account exists for that email, a reset link has been sent.");
      setForgotMode(false);
    } catch (err: any) {
      setError(err?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const anySso = providers.google || providers.azure || providers.okta;
  const current = LOGIN_SLIDES[slide];

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-[48%] flex-shrink-0 flex flex-col justify-between p-14" style={{ backgroundColor: "#eae6e1" }}>
        <div />

        {/* Slide content */}
        <div className="max-w-sm">
          {/* Tag */}
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={15} className="text-blue-500" />
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">{current.tag}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl leading-tight mb-4" style={{ fontFamily: "'Georgia', serif" }}>
            <span className="font-black text-gray-900">{current.headline[0]}<br />{current.headline[1]}</span>{" "}
            <span className="font-normal text-gray-700">{current.rest}</span>
          </h1>

          <p className="text-sm text-gray-500 mb-10">{current.sub}</p>

          <button className="flex items-center gap-3 px-6 py-3.5 border-2 border-gray-900 rounded-full text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors">
            Talk with our team <ArrowRight size={16} />
          </button>
        </div>

        {/* Slide dots */}
        <div className="flex items-center gap-2 pb-2">
          {LOGIN_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slide ? "w-8 h-2.5 bg-gray-800" : "w-2.5 h-2.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center px-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <BrandLogo className="w-[180px] h-auto object-contain mb-4" alt="NexHealth" />
            <h2 className="text-xl font-bold text-gray-900">Log in to NexHealth</h2>
          </div>

          {/* Error / notice banners */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
              {notice}
            </div>
          )}

          {/* Form */}
          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); forgotMode ? handleForgot() : handleLogin(); }}
          >
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              />
            </div>

            {!forgotMode && needsTotp && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Authentication code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
                  placeholder="6-digit code from authenticator"
                />
              </div>
            )}

            {/* Password (hidden in forgot mode) */}
            {!forgotMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-800">Password</label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(null); setNotice(null); }}
                    className="text-sm text-teal-500 hover:text-teal-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#2dd4bf" }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = "#14b8a6"; }}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#2dd4bf")}
            >
              {submitting ? "Please wait…" : forgotMode ? "Send reset link" : "Log in"}
            </button>

            {forgotMode && (
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(null); setNotice(null); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to log in
              </button>
            )}
          </form>

          {/* SSO — only shown when at least one provider is configured */}
          {!forgotMode && anySso && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-3">
                {providers.google && (
                  <a
                    href={ssoLoginUrl("google")}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18L12.048 13.56c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.042L3.964 10.71z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345L15.02 2.34C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </a>
                )}
                {providers.azure && (
                  <a
                    href={ssoLoginUrl("azure")}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                      <rect width="10" height="10" fill="#F25022"/>
                      <rect x="11" width="10" height="10" fill="#7FBA00"/>
                      <rect y="11" width="10" height="10" fill="#00A4EF"/>
                      <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                    </svg>
                    Continue with Azure
                  </a>
                )}
                {providers.okta && (
                  <a
                    href={ssoLoginUrl("okta")}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-[18px] h-[18px] rounded-full border-[3px] border-gray-800" />
                    Continue with Okta
                  </a>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-10">
            © 2026 NexHealth • The Patient Experience Platform
          </p>
        </div>
      </div>
    </div>
  );
}
