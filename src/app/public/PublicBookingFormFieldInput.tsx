import type { PublicBookingFormField } from "../lib/public-booking-api";
import { DatePicker } from "../components/shared/DatePicker";
import { freeTextError } from "../lib/bookingFieldGuards";

export function isBookingDateField(field: Pick<PublicBookingFormField, "field_type" | "label">): boolean {
  if (field.field_type === "date") return true;
  if (field.field_type !== "number" && field.field_type !== "text") return false;
  return /\b(date|when|calendar|happened|dob|birth)\b/i.test(field.label);
}

function isoCalendarDateError(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return "Please pick a date from the calendar.";
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return "Please pick a valid calendar date.";
  }
  return null;
}

type PaymentAnswer = {
  cardholder_name?: string;
  last_four?: string;
  expiry?: string;
  authorized?: boolean;
};

export function PublicBookingFormFieldInput({
  field,
  value,
  onChange,
  invalid = false,
}: {
  field: PublicBookingFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  invalid?: boolean;
}) {
  const inputCls = invalid
    ? "w-full px-3.5 py-2.5 border border-red-400 rounded-xl text-sm text-gray-800 outline-none bg-red-50/30 focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
    : "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all";
  if (field.field_type === "note") {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3.5 py-3">
        <p className="text-xs font-semibold text-amber-900 mb-1">{field.label}</p>
        <p className="text-xs text-amber-800/80 leading-relaxed">{field.help_text || field.label}</p>
      </div>
    );
  }

  const label = (
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </label>
  );

  if (field.field_type === "number" && !isBookingDateField(field)) {
    return (
      <div>
        {label}
        <input
          type="number"
          inputMode="decimal"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          placeholder="0"
        />
      </div>
    );
  }

  if (isBookingDateField(field)) {
    return (
      <div>
        {label}
        <DatePicker
          value={(value as string) ?? ""}
          onChange={(iso) => onChange(iso)}
          aria-label={field.label}
          inputClassName={invalid ? "border-red-400 ring-2 ring-red-100" : ""}
        />
      </div>
    );
  }

  if (field.field_type === "single_select") {
    return (
      <div>
        {label}
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} bg-white`}
        >
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.field_type === "multi_select") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        {label}
        <div className={`space-y-2 rounded-xl border bg-white p-3.5 ${invalid ? "border-red-400" : "border-gray-200"}`}>
          {field.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((v) => v !== opt);
                  onChange(next);
                }}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.field_type === "payment") {
    const payment = (value as PaymentAnswer) ?? {};
    return (
      <div className="space-y-3">
        {label}
        <p className="text-xs text-gray-500">
          Your card will be stored on file for no-show or cancellation charges per practice policy.
        </p>
        <input
          value={payment.cardholder_name ?? ""}
          onChange={(e) => onChange({ ...payment, cardholder_name: e.target.value })}
          placeholder="Name on card"
          className={inputCls}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={payment.last_four ?? ""}
            onChange={(e) =>
              onChange({ ...payment, last_four: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
            placeholder="Last 4 digits"
            className={inputCls}
            inputMode="numeric"
          />
          <input
            value={payment.expiry ?? ""}
            onChange={(e) => onChange({ ...payment, expiry: e.target.value })}
            placeholder="MM/YY"
            className={inputCls}
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(payment.authorized)}
            onChange={(e) => onChange({ ...payment, authorized: e.target.checked })}
            className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          I authorize this practice to store my payment method on file.
        </label>
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder="Your answer…"
      />
    </div>
  );
}

function isValidNumber(value: unknown): boolean {
  const s = String(value ?? "").trim();
  if (!s) return false;
  return !Number.isNaN(Number(s));
}

export function validateFormField(field: PublicBookingFormField, value: unknown): string | null {
  if (field.field_type === "note") return null;

  if (isBookingDateField(field)) {
    const text = String(value ?? "").trim();
    if (!text) return field.required ? `${field.label} is required.` : null;
    return isoCalendarDateError(text);
  }

  if (field.field_type === "number") {
    const text = String(value ?? "").trim();
    if (!text) {
      return field.required ? `${field.label} is required.` : null;
    }
    if (!isValidNumber(text)) return `Please enter a valid number for: ${field.label}`;
    return null;
  }

  if (field.field_type === "multi_select") {
    if (!field.required) return null;
    return Array.isArray(value) && value.length > 0 ? null : `${field.label} is required.`;
  }
  if (field.field_type === "single_select") {
    const text = String(value ?? "").trim();
    if (!text) return field.required ? `${field.label} is required.` : null;
    return null;
  }

  if (field.field_type === "payment") {
    const payment = (value as PaymentAnswer) ?? {};
    if (!payment.authorized) return `${field.label} is required.`;
    if (!payment.cardholder_name?.trim() || !payment.last_four?.trim() || !payment.expiry?.trim()) {
      return `${field.label} is required.`;
    }
    return null;
  }
  return freeTextError(String(value ?? ""), field.label, field.required);
}
