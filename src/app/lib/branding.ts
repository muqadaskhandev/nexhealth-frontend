import defaultLogo from "../../imports/nexlogo.png";

/** Platform default when a practice has not uploaded its own logo. */
export const DEFAULT_PRACTICE_LOGO = defaultLogo;

export function resolveLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim();
  return trimmed || DEFAULT_PRACTICE_LOGO;
}
