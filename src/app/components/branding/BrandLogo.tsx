import { resolveLogoUrl } from "../../lib/branding";

type BrandLogoProps = {
  logoUrl?: string | null;
  alt?: string;
  className?: string;
  /** Preset sizes — header fills the top bar. */
  variant?: "header" | "default";
};

const VARIANT_CLASS: Record<NonNullable<BrandLogoProps["variant"]>, string> = {
  header: "h-14 sm:h-16 w-auto max-w-[480px] object-contain object-left",
  default: "h-11 w-auto max-w-[260px] object-contain object-left",
};

export function BrandLogo({
  logoUrl,
  alt = "Organization logo",
  className,
  variant = "default",
}: BrandLogoProps) {
  const cls = className ?? VARIANT_CLASS[variant];
  return <img src={resolveLogoUrl(logoUrl)} alt={alt} className={cls} />;
}
