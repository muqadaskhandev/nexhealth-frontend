import { BrandLogo } from "../branding/BrandLogo";

/**
 * Branded loading screen — logo + soft teal pulse, matching platform accents.
 */
export function LoadingScreen({
  fullScreen = false,
  className = "",
}: {
  fullScreen?: boolean;
  className?: string;
}) {
  const mark = (
    <div
      className={`loading-brand ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="loading-brand__mark">
        <span className="loading-brand__ring" aria-hidden="true" />
        <span className="loading-brand__ring loading-brand__ring--delayed" aria-hidden="true" />
        <div className="loading-brand__logo">
          <BrandLogo
            alt="VaraSync"
            className="h-16 sm:h-20 w-auto max-w-[280px] object-contain"
          />
        </div>
      </div>
      <div className="loading-brand__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="loading-brand__label">Loading</p>
    </div>
  );

  if (!fullScreen) return mark;

  return <div className="loading-brand-screen">{mark}</div>;
}

/** @deprecated Use LoadingScreen */
export const LoadingBounce = LoadingScreen;
