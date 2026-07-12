import { resolveLogoUrl } from "../../lib/branding";

type BrandLogoProps = {
  logoUrl?: string | null;
  alt?: string;
  className?: string;
};

export function BrandLogo({
  logoUrl,
  alt = "Organization logo",
  className = "h-11 w-auto max-w-[160px] object-contain",
}: BrandLogoProps) {
  return <img src={resolveLogoUrl(logoUrl)} alt={alt} className={className} />;
}
