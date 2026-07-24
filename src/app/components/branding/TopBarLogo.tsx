import { BrandLogo } from "../branding/BrandLogo";

/**
 * Fixed top-left logo slot used in the app header.
 * Keeps wordmarks and square marks visually aligned without stretching.
 */
export function TopBarLogo({
  logoUrl,
  alt,
}: {
  logoUrl?: string | null;
  alt: string;
}) {
  return (
    <div
      className="hidden sm:flex items-center justify-start h-10 w-[180px] min-w-[140px] max-w-[200px] flex-shrink-0"
      title={alt}
    >
      <BrandLogo
        logoUrl={logoUrl}
        alt={alt}
        className="h-full w-full max-h-10 object-contain object-left"
      />
    </div>
  );
}
