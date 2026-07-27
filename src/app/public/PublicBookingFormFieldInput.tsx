import type { PublicBookingFormField } from "../lib/public-booking-api";

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
}: {
  field: PublicBookingFormField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm";

  if (field.field_type === "note") {
    return (
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{field.help_text || field.label}</p>
    );
  }

  const label = (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {field.label}
      {field.required && " *"}
    </label>
  );

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
        <div className="space-y-1.5 rounded-lg border border-gray-200 p-3">
          {field.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
            onChange={(e) => onChange({ ...payment, last_four: e.target.value.replace(/\D/g, "").slice(0, 4) })}
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
      />
    </div>
  );
}

export function validateFormField(field: PublicBookingFormField, value: unknown): string | null {
  if (field.field_type === "note" || !field.required) return null;
  if (field.field_type === "multi_select") {
    return Array.isArray(value) && value.length > 0 ? null : `Please complete: ${field.label}`;
  }
  if (field.field_type === "payment") {
    const payment = (value as PaymentAnswer) ?? {};
    if (!payment.authorized) return `Please complete: ${field.label}`;
    if (!payment.cardholder_name?.trim() || !payment.last_four?.trim() || !payment.expiry?.trim()) {
      return `Please complete: ${field.label}`;
    }
    return null;
  }
  return String(value ?? "").trim() ? null : `Please complete: ${field.label}`;
}
