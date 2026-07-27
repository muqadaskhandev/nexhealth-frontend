import type { ReactNode } from "react";
import { Clock } from "lucide-react";
import { EHR_COMING_SOON_MESSAGE } from "../../lib/ehr-features";

export function EhrComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
    >
      <Clock size={10} aria-hidden />
      Coming soon
    </span>
  );
}

export function EhrComingSoonBanner({
  message = EHR_COMING_SOON_MESSAGE,
  title = "EHR sync coming soon",
}: {
  message?: string;
  title?: string;
}) {
  return (
    <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
      <p className="font-semibold flex items-center gap-2">
        <Clock size={15} className="text-amber-700 flex-shrink-0" aria-hidden />
        {title}
      </p>
      <p className="text-xs mt-1 leading-relaxed text-amber-800">{message}</p>
    </div>
  );
}

export function EhrComingSoonSection({
  children,
  locked,
  message = EHR_COMING_SOON_MESSAGE,
  title = "EHR sync coming soon",
}: {
  children: ReactNode;
  locked: boolean;
  message?: string;
  title?: string;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-60">{children}</div>
      <div className="absolute inset-0 flex items-start justify-center pt-6 px-4">
        <div className="max-w-md w-full shadow-lg">
          <EhrComingSoonBanner message={message} title={title} />
        </div>
      </div>
    </div>
  );
}

export function EhrFeatureList({
  features,
}: {
  features: Array<{ id: string; label: string; description: string; status: string }>;
}) {
  if (features.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-border">
        <p className="text-sm font-semibold text-gray-900">EHR capabilities</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Preview what's included when your health record connection goes live.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {features.map((feature) => (
          <li key={feature.id} className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{feature.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feature.description}</p>
            </div>
            {feature.status === "coming_soon" ? (
              <EhrComingSoonBadge className="flex-shrink-0 mt-0.5" />
            ) : (
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Available
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
