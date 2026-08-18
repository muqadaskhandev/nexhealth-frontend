/** Reject keyboard mash / placeholder answers on public booking (chat + classic). */

const JUNK = new Set([
  "name",
  "fullname",
  "lastname",
  "first name",
  "last name",
  "full name",
  "email",
  "phone",
  "number",
  "date",
  "address",
  "test",
  "testing",
  "asdf",
  "asd",
  "qwerty",
  "xxx",
  "xxxx",
  "abc",
  "abcd",
  "null",
  "undefined",
  "none",
  "n/a",
  "na",
  "nil",
  "string",
  "text",
  "value",
  "answer",
  "sample",
  "example",
  "foo",
  "bar",
  "baz",
  ".",
  "-",
  "--",
  "...",
]);

const KEYBOARD_MASH = /asdf+|qwer+|zxcv+|hjkl+|qazwsx|wsxedc|1234+|abcd+|fghj+|uiop+/i;
const VOWELS = new Set("aeiouyAEIOUY");
const NAME_RE = /^[A-Za-z][A-Za-z\s'\-]{1,78}$/;
const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

const NAME_LIKE_BIGRAMS = new Set(
  (
    "th he an in er re on at en nd st es or te ed is it al ar nt ng se ha as ou " +
    "le ve co me de hi ri ro ic ne ea ra ce li ch el la ll be ma na sh ti ca pa " +
    "sa da ta mi ki ja jo ka ke ko lu ly ny ph qu sc sk sm sn sp sw tw wh ye yo " +
    "br cr dr fr gr pr tr cl fl gl pl sl bl kn ck gh mb mp nk ld lt rd rk rm rn " +
    "rs rt wn ia ie io ou ay ey oy oo ee ah eh oh ul um un ur us ut wa we wi wo " +
    "ya ye za ze zo ad af ag ai ak am ao ap aq au av aw ax az ba bi bo bu by " +
    "di do du em eu fa fe fi fo fu ga ge gi go gu ho hu hy id if ig il im ip ir " +
    "je ji ju lo ni no nu oc od of og oh ok ol om op os ot ov ox oz pe pi po pu " +
    "qa qi ra ru si so su to tu va vi vo vu xi za zu " +
    "mu uq qa ad da as ng uy"
  ).split(" ")
);

function isJunk(value: string, allowShort = false): boolean {
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (JUNK.has(cleaned)) return true;
  if (/^(.)\1{2,}$/.test(cleaned)) return true;
  if (!allowShort && /^[a-z]{1,2}$/.test(cleaned)) return true;
  if (KEYBOARD_MASH.test(cleaned.replace(/[\s'\-]/g, ""))) return true;
  return false;
}

function nameBigramsLookReal(part: string): boolean {
  const compact = part.toLowerCase().replace(/[^a-z]/g, "");
  if (compact.length < 5) return true;
  const pairs = [];
  for (let i = 0; i < compact.length - 1; i++) pairs.push(compact.slice(i, i + 2));
  const hits = pairs.filter((p) => NAME_LIKE_BIGRAMS.has(p)).length;
  const ratio = hits / Math.max(pairs.length, 1);
  if (compact.length >= 7) return hits >= 3 && ratio >= 0.35;
  return hits >= 2 || ratio >= 0.4;
}

function nameLooksImplausible(value: string): boolean {
  const parts = value.split(/[\s'\-]+/).filter(Boolean);
  if (!parts.length || parts.length > 5) return true;
  for (const part of parts) {
    if (part.length === 1) continue;
    if (part.length > 16) return true;
    if (part.length >= 3 && ![...part].some((ch) => VOWELS.has(ch))) return true;
    let run = 0;
    for (const ch of part) {
      if (VOWELS.has(ch)) run = 0;
      else if (/[A-Za-z]/.test(ch)) {
        run += 1;
        if (run >= 5) return true;
      }
    }
    if (!nameBigramsLookReal(part)) return true;
  }
  return false;
}

export function looksLikeGibberish(value: string): boolean {
  const raw = value.trim().replace(/\s+/g, " ");
  if (!raw) return false;
  if (isJunk(raw, true)) return true;
  const words = raw.match(/[A-Za-z]+/g) ?? [];
  for (const word of words) {
    if (word === word.toUpperCase() && word.length >= 2 && word.length <= 6) continue;
    if (nameLooksImplausible(word)) return true;
  }
  return false;
}

export function personNameError(value: string, label = "name"): string | null {
  const val = value.trim().replace(/\s+/g, " ");
  const pretty = label.toLowerCase();
  const retry = `That doesn't look like a real ${pretty}. Please use letters only (for example, Jane).`;
  if (!val) return `Please enter a ${pretty}.`;
  if (isJunk(val, true) || nameLooksImplausible(val)) return retry;
  if (/\d/.test(val)) return `Please enter a valid ${pretty} without numbers.`;
  if (!NAME_RE.test(val) || val.length < 2) return `Please enter a valid ${pretty} using letters only.`;
  return null;
}

export function bookingEmailError(value: string, required: boolean): string | null {
  const val = value.trim().toLowerCase();
  if (!val) return required ? "Please enter a valid email address." : null;
  const local = val.includes("@") ? val.split("@")[0] : val;
  if (isJunk(val) || isJunk(local, true) || looksLikeGibberish(local) || val.includes(" ") || !EMAIL_RE.test(val)) {
    return "Please enter a valid email address (example: jane@email.com).";
  }
  return null;
}

export function bookingPhoneError(value: string, required: boolean): string | null {
  const val = value.trim();
  if (!val) return required ? "Please enter a valid phone number." : null;
  const digits = val.replace(/\D/g, "");
  if (isJunk(val) || digits.length < 7 || digits.length > 15) {
    return "Please enter a valid phone number (7–15 digits).";
  }
  if (/^(\d)\1{6,}$/.test(digits)) {
    return "Please enter a real phone number — repeating digits are not accepted.";
  }
  return null;
}

export function bookingZipError(value: string, required: boolean): string | null {
  const val = value.trim();
  if (!val) return required ? "Please enter a zip code." : null;
  if (isJunk(val) || !/^\d{4,10}$/.test(val)) return "Please enter a valid zip code using numbers only.";
  if (/^(\d)\1{3,}$/.test(val)) return "Please enter a real zip code.";
  return null;
}

export function freeTextError(value: string, label: string, required: boolean): string | null {
  const val = value.trim().replace(/\s+/g, " ");
  if (!val) return required ? `${label} is required.` : null;
  if (isJunk(val, true) || looksLikeGibberish(val)) {
    return `That doesn't look like a valid answer for ${label}. Please enter real information.`;
  }
  return null;
}
