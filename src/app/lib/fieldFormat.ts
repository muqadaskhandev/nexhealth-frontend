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
  today.setHours(0, 0, 0, 0);
  if (date >= today) return null;
  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 120);
  if (date < oldest) return null;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return dobIsoError(trimmed);
  }
  if (digitsOnly(trimmed).length < 8) {
    return "Enter a complete date as MM/DD/YYYY.";
  }
  if (!isValidDob(trimmed)) {
    return "That doesn't look like a real date of birth. Please pick a date in the past (for example, 03/15/1990).";
  }
  return null;
}

export function isDobField(field: { id?: string; label?: string } | null | undefined): boolean {
  if (!field) return false;
  const blob = `${field.id ?? ""} ${field.label ?? ""}`.toLowerCase();
  return /\bdob\b|birth/.test(blob);
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** HTML date `min`/`max` for DOB pickers (yesterday is the latest allowed). */
export function dobInputBounds(): { min: string; max: string } {
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const oldest = new Date(yesterday);
  oldest.setFullYear(oldest.getFullYear() - 120);
  return { min: localIsoDate(oldest), max: localIsoDate(yesterday) };
}

export function dobIsoError(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) {
    return "That doesn't look like a real date of birth. Please pick a date in the past (for example, 03/15/1990).";
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return "Please enter a valid calendar date of birth.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed >= today) {
    return "Date of birth cannot be today or in the future. Please pick a past date.";
  }
  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 120);
  if (parsed < oldest) {
    return "Please enter a realistic date of birth.";
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

// ── Password strength ────────────────────────────────────────────────────────

/** At least 6 chars, 1 uppercase, 1 number, and 1 "@". */
export function passwordStrengthError(
  password: string,
  opts: { required?: boolean } = {}
): string | null {
  if (!password) return opts.required ? "Password is required." : null;
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!password.includes("@")) {
    return 'Password must include at least one "@" symbol.';
  }
  return null;
}

export function passwordsMatchError(
  password: string,
  confirm: string
): string | null {
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

// ── ZIP / postal code ────────────────────────────────────────────────────────

/** Digits only — no letters, spaces, or decimals. Max 10 digits. */
export function formatZipInput(raw: string): string {
  return digitsOnly(raw, 10);
}

export function zipError(
  value: string,
  opts: { required?: boolean } = {}
): string | null {
  const t = value.trim();
  if (!t) return opts.required ? "ZIP code is required." : null;
  if (!/^\d+$/.test(t)) {
    return "ZIP code must contain numbers only.";
  }
  if (t.length < 4) return "Enter a valid ZIP code.";
  if (t.length > 10) return "ZIP code is too long.";
  return null;
}
