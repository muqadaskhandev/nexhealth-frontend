import { CheckCircle2 } from "lucide-react";

/**
 * Public thank-you page shown after online booking when practices
 * set this URL as their post-booking redirect.
 *
 * Example: http://localhost:5173/booking/thank-you
 */
export function PublicBookingThankYouPage() {
  const params = new URLSearchParams(window.location.search);
  const practiceName = params.get("practice") || "the practice";
  const email = params.get("email");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-teal-500" />
        <h1 className="text-xl font-bold text-gray-900">Thank you for booking!</h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          Your appointment request with {practiceName} has been received. We&apos;ll send a confirmation
          {email ? ` to ${email}` : " to your email"} shortly.
        </p>
        <p className="text-xs text-gray-400">
          You can close this page. If you need to make changes, contact the practice directly.
        </p>
      </div>
    </div>
  );
}
