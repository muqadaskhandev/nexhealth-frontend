import { BrandLogo } from "../branding/BrandLogo";

/**
 * Fixed top-left logo slot used in the app header.
 * Wide enough for wordmarks; acts as a plain home link (not a button).
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
      variant="header"
    />
  );

  const slotClass =
    "flex items-center justify-start h-full min-w-[280px] w-auto max-w-[480px] flex-shrink-0 pr-2";

  if (!onClick) {
    return (
      <div className={slotClass} title={alt}>
        {content}
      </div>
    );
  }

  return (
    <a
      href="/"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={`${alt} — go to dashboard`}
      aria-label="Go to dashboard"
      className={`${slotClass} no-underline cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 rounded-lg`}
    >
      {content}
    </a>
  );
}
