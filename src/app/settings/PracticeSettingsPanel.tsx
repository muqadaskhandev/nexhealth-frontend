import { useEffect, useState, type FormEvent } from "react";
import { practiceApi, Practice } from "../lib/api";
import { BrandLogo } from "../components/branding/BrandLogo";
import { SynchronizerPanel } from "./SynchronizerPanel";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white";

const PRODUCT_LABELS: Record<string, string> = {
  scheduling: "Scheduling",
  forms: "Forms",
  communications: "Communications",
  payments: "Payments",
  verification: "Insurance Verification",
};

export function PracticeSettingsPanel() {
  const [practice, setPractice] = useState<Practice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    practiceApi
      .me()
      .then(setPractice)
      .catch((err: { detail?: string }) =>
        setError(err?.detail || "Could not load practice settings.")
      );
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!practice) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await practiceApi.update({
        name: practice.name,
        logo_url: practice.logo_url,
        address: practice.address,
        city: practice.city,
        state: practice.state,
        zip_code: practice.zip_code,
        phone: practice.phone,
        enabled_products: practice.enabled_products,
      });
      setPractice(updated);
      setNotice("Practice settings saved.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!practice) {
    return <p className="text-sm text-gray-500">{error || "Loading practice…"}</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Practice</h2>
        <p className="text-sm text-gray-500 mt-1">Logo, address, locations, and products.</p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="px-3 py-2 rounded-lg bg-green-50 text-sm text-green-700">{notice}</div>
      )}

      <form onSubmit={saveProfile} className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Branding & contact</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Practice name</label>
          <input
            value={practice.name}
            onChange={(e) => setPractice({ ...practice, name: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-2">
              <BrandLogo
                logoUrl={practice.logo_url}
                alt={`${practice.name} logo`}
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-xs text-gray-500">
              Leave blank to use the default NexHealth logo.
            </p>
          </div>
          <input
            value={practice.logo_url || ""}
            onChange={(e) => setPractice({ ...practice, logo_url: e.target.value || null })}
            className={inputCls}
            placeholder="https://…"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={practice.address}
              onChange={(e) => setPractice({ ...practice, address: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              value={practice.city}
              onChange={(e) => setPractice({ ...practice, city: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              value={practice.state}
              onChange={(e) => setPractice({ ...practice, state: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              value={practice.zip_code}
              onChange={(e) => setPractice({ ...practice, zip_code: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={practice.phone}
              onChange={(e) => setPractice({ ...practice, phone: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
        >
          Save practice profile
        </button>
      </form>

      <SynchronizerPanel
        practice={practice}
        onPracticeChange={setPractice}
        onNotice={setNotice}
        onError={setError}
      />

      <div className="bg-white rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Enabled products</h3>
        {Object.entries(PRODUCT_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={practice.enabled_products[key as keyof typeof practice.enabled_products]}
              onChange={(e) =>
                setPractice({
                  ...practice,
                  enabled_products: {
                    ...practice.enabled_products,
                    [key]: e.target.checked,
                  },
                })
              }
              className="rounded border-gray-300 text-teal-600"
            />
            {label}
          </label>
        ))}
        <button
          type="button"
          disabled={saving}
          onClick={() => saveProfile({ preventDefault: () => {} } as FormEvent)}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
        >
          Save product settings
        </button>
      </div>
    </div>
  );
}
