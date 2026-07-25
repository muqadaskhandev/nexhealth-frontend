/**
 * Loading — L ↔ i play catch (wcr.is-style pure CSS loop).
 * Ball swings on a rotate+translate arc; i squashes/stretches; L stem syncs via mask.
 */
export function LoadingScreen({
  fullScreen = false,
  className = "",
}: {
  fullScreen?: boolean;
  className?: string;
}) {
  const letters = ["L", "o", "a", "d", "i", "n", "g"];

  const mark = (
    <p
      className={`loader-text ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {letters.map((ch, i) => (
        <span key={`${ch}-${i}`} className="loader-letter" aria-hidden="true">
          {ch}
        </span>
      ))}
    </p>
  );

  if (!fullScreen) return mark;

  return (
    <div id="loader-container" className="loader-container">
      <div className="loader-ambient" aria-hidden="true" />
      <div className="loader-divider" aria-hidden="true" />
      <div className="loader-stage">
        {mark}
        <span className="loader-pulse" aria-hidden="true" />
      </div>
    </div>
  );
}

/** @deprecated Use LoadingScreen */
export const LoadingBounce = LoadingScreen;
