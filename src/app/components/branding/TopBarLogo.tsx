import { BrandLogo } from "../branding/BrandLogo";

/**
 * Fixed top-left logo slot used in the app header.
 * Keeps wordmarks and square marks visually aligned without stretching.
 */
export function TopBarLogo({
  logoUrl,
  alt,
  onClick,
}: {
  logoUrl?: string | null;
  alt: string;
  onClick?: () => void;
}) {
  const content = (
    <BrandLogo
      logoUrl={logoUrl}
      alt={alt}
      className="h-full w-full max-h-10 object-contain object-left"
    />
  );

  if (!onClick) {
    return (
      <div
        className="hidden sm:flex items-center justify-start h-10 w-[180px] min-w-[140px] max-w-[200px] flex-shrink-0"
        title={alt}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${alt} — go to dashboard`}
      aria-label="Go to dashboard"
      className="hidden sm:flex items-center justify-start h-10 w-[180px] min-w-[140px] max-w-[200px] flex-shrink-0 rounded-lg hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
    >
      {content}
    </button>
  );
}
