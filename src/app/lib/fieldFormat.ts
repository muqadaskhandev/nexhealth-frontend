/** Shared DOB / phone / email formatting + validation for platform forms. */

export function digitsOnly(value: string, max?: number): string {
  const digits = value.replace(/\D/g, "");
  return typeof max === "number" ? digits.slice(0, max) : digits;
}

// ── Date of birth (MM/DD/YYYY) ───────────────────────────────────────────────

/** Auto-insert `/` while typing; digits only, max MM/DD/YYYY. */
export function formatDobInput(raw: string): string {
  const d = digitsOnly(raw, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function formatDobFromDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getFullYear()}`;
}

/** Parse a complete MM/DD/YYYY into a real calendar date, or null if invalid. */
export function parseDob(value: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const now = new Date();
  const maxYear = now.getFullYear();
  if (year < 1900 || year > maxYear) return null;
  if (month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return null;
  return date;
}

export function isValidDob(value: string): boolean {
  return parseDob(value) !== null;
}

export function dobError(
  value: string,
  opts: { required?: boolean } = {}
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return opts.required ? "Date of birth is required." : null;
  if (digitsOnly(trimmed).length < 8) {
    return "Enter a complete date as MM/DD/YYYY.";
  }
  if (!isValidDob(trimmed)) {
    return "Enter a valid date of birth.";
  }
  return null;
}

// ── Phone ────────────────────────────────────────────────────────────────────

/** Format national number while typing. US/CA (+1) → (XXX) XXX-XXXX. */
export function formatNationalPhoneInput(raw: string, dial = "1"): string {
  if (dial === "1") {
    const d = digitsOnly(raw, 10);
    if (!d) return "";
    if (d.length < 4) return `(${d}`;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return digitsOnly(raw, 15);
}

/** Format a standalone US-style phone field (no dial selector). */
export function formatPhoneInput(raw: string): string {
  return formatNationalPhoneInput(raw, "1");
}

export function isCompleteNationalPhone(national: string, dial = "1"): boolean {
  const d = digitsOnly(national);
  if (dial === "1") return d.length === 10;
  return d.length >= 7 && d.length <= 15;
}

export function nationalPhoneError(
  national: string,
  dial = "1",
  opts: { required?: boolean } = {}
): string | null {
  const d = digitsOnly(national);
  if (!d) return opts.required ? "Phone number is required." : null;
  if (dial === "1") {
    if (d.length !== 10) return "Enter a complete 10-digit phone number.";
    return null;
  }
  if (d.length < 7) return "Enter a complete phone number.";
  if (d.length > 15) return "Phone number is too long.";
  return null;
}

export function phoneError(
  phone: string,
  opts: { required?: boolean } = {}
): string | null {
  return nationalPhoneError(phone, "1", opts);
}

// ── Email ────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t || t.length > 254) return false;
  if (t.includes("..")) return false;
  return EMAIL_RE.test(t);
}

export function emailError(
  email: string,
  opts: { required?: boolean } = {}
): string | null {
  const t = email.trim();
  if (!t) return opts.required ? "Email is required." : null;
  if (!isValidEmail(t)) return "Enter a valid email address.";
  return null;
}
