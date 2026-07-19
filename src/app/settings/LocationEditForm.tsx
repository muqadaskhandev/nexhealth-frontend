import { useMemo, useState, type FormEvent } from "react";
import { practiceApi, type ApiLocation } from "../lib/api";
import {
  COUNTRY_DIAL_CODES,
  CUSTOM_OPTION,
  US_STATES,
  citiesForState,
  formatPhoneWithDial,
  isListedCity,
  isListedDial,
  isListedState,
  parsePhoneWithDial,
} from "../lib/locationFormat";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white";

type Props = {
  /** Pass null / undefined to create a new location. */
  location?: ApiLocation | null;
  onSaved: (loc: ApiLocation) => void;
  onCancel: () => void;
};

export function LocationEditForm({ location, onSaved, onCancel }: Props) {
  const isCreate = !location;
  const parsed = parsePhoneWithDial(location?.phone || "");
  const initialCustomState = !!(location?.state && !isListedState(location.state));
  const initialCustomCity = !!(
    location?.city &&
    (initialCustomState || !isListedCity(location.state || "", location.city))
  );
  const initialCustomDial = location ? !isListedDial(parsed.dial) : false;

  const [form, setForm] = useState({
    name: location?.name || "",
    address: location?.address || "",
    address_line2: location?.address_line2 || "",
    city: location?.city || "",
    state: location?.state || "",
    zip_code: location?.zip_code || "",
    email: location?.email || "",
  });
  const [dial, setDial] = useState(parsed.dial || "1");
  const [nationalPhone, setNationalPhone] = useState(parsed.national);
  const [customState, setCustomState] = useState(initialCustomState);
  const [customCity, setCustomCity] = useState(initialCustomCity);
  const [customDial, setCustomDial] = useState(initialCustomDial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cityOptions = useMemo(
    () => (customState ? [] : citiesForState(form.state)),
    [form.state, customState]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      phone: formatPhoneWithDial(dial, nationalPhone),
    };
    try {
      const saved = isCreate
        ? await practiceApi.addLocation(body)
        : await practiceApi.updateLocation(location.id, body);
      onSaved(saved);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not save location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        {isCreate
          ? "Enter the office name, address, phone, and email."
          : "Adjust the address, phone number, or email as needed."}
      </p>
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls}
          placeholder="e.g. Better Dental — Downtown"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location address</label>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={inputCls}
          placeholder="Street address"
        />
        <input
          value={form.address_line2}
          onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
          className={`${inputCls} mt-2`}
          placeholder="Street address 2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select
            required={!customState}
            value={customState ? CUSTOM_OPTION : form.state}
            onChange={(e) => {
              const next = e.target.value;
              if (next === CUSTOM_OPTION) {
                setCustomState(true);
                setCustomCity(true);
                setForm({ ...form, state: "", city: "" });
                return;
              }
              setCustomState(false);
              setCustomCity(false);
              const cities = citiesForState(next);
              setForm({
                ...form,
                state: next,
                city: cities.includes(form.city) ? form.city : "",
              });
            }}
            className={inputCls}
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Other (enter custom)…</option>
          </select>
          {customState && (
            <input
              required
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={`${inputCls} mt-2`}
              placeholder="Enter state / province / region"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <select
            required={!customCity}
            value={customCity ? CUSTOM_OPTION : form.city}
            disabled={!form.state && !customState}
            onChange={(e) => {
              const next = e.target.value;
              if (next === CUSTOM_OPTION) {
                setCustomCity(true);
                setForm({ ...form, city: "" });
                return;
              }
              setCustomCity(false);
              setForm({ ...form, city: next });
            }}
            className={inputCls}
          >
            <option value="">
              {form.state || customState ? "Select city" : "Select state first"}
            </option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
            <option value={CUSTOM_OPTION} disabled={!form.state && !customState}>
              Other (enter custom)…
            </option>
          </select>
          {customCity && (
            <input
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={`${inputCls} mt-2`}
              placeholder="Enter city"
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
        <input
          value={form.zip_code}
          onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
          className={inputCls}
          placeholder="94114"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location phone number
        </label>
        <div className="flex gap-2">
          <select
            value={customDial ? CUSTOM_OPTION : dial}
            onChange={(e) => {
              const next = e.target.value;
              if (next === CUSTOM_OPTION) {
                setCustomDial(true);
                setDial("");
                return;
              }
              setCustomDial(false);
              setDial(next);
            }}
            className="w-[7.5rem] shrink-0 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
            aria-label="Country code"
          >
            {COUNTRY_DIAL_CODES.map((c) => (
              <option key={`${c.code}-${c.dial}`} value={c.dial}>
                {c.code} +{c.dial}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>Other (enter custom)…</option>
          </select>
          {customDial && (
            <input
              required
              value={dial}
              onChange={(e) => setDial(e.target.value.replace(/[^\d]/g, ""))}
              className="w-20 shrink-0 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white"
              placeholder="92"
              inputMode="numeric"
            />
          )}
          <input
            value={nationalPhone}
            onChange={(e) => setNationalPhone(e.target.value)}
            className={inputCls}
            inputMode="tel"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location email
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Contact email shown on patient communications for this office (optional).
        </p>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputCls}
          placeholder="office@example.com"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
        >
          {saving ? "Saving…" : isCreate ? "Create location" : "Save"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
