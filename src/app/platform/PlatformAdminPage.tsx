import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LogOut, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { BrandLogo } from "../components/branding/BrandLogo";
import {
  EnabledProducts,
  platformApi,
  Practice,
  PracticeCreatePayload,
  SubscriptionPlan,
} from "../lib/api";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

const DEFAULT_PRODUCTS: EnabledProducts = {
  scheduling: true,
  forms: true,
  communications: true,
  payments: false,
  verification: false,
};

export function PlatformAdminPage() {
  const { logout, user } = useAuth();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPractices(await platformApi.listPractices());
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not load practices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo className="h-12 w-auto max-w-[200px] object-contain" alt="NexHealth" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Platform Admin</h1>
            <p className="text-sm text-gray-500">Onboard practices & assign plans</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}
        {notice && (
          <div className="px-4 py-3 rounded-lg bg-green-50 text-sm text-green-700 border border-green-100">
            {notice}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Practices</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg"
          >
            <Plus size={16} /> Onboard practice
          </button>
        </div>

        {showForm && (
          <OnboardPracticeForm
            onCancel={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              setNotice("Practice created. Invite email sent via SES.");
              load();
            }}
          />
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="grid gap-4">
            {practices.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden p-1.5">
                  <BrandLogo
                    logoUrl={p.logo_url}
                    alt={`${p.name} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {p.city}, {p.state} · Plan: {p.subscription_plan}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    EHR: {p.ehr_system.replace("_", " ")} · Sync: {p.sync_status} ·{" "}
                    {p.locations.length} location(s)
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    p.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OnboardPracticeForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<PracticeCreatePayload>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    subscription_plan: "starter",
    enabled_products: DEFAULT_PRODUCTS,
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PracticeCreatePayload>(key: K, value: PracticeCreatePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await platformApi.createPractice(form);
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not create practice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
    >
      <h3 className="font-semibold text-gray-900">New practice</h3>
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Practice name</label>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input value={form.state} onChange={(e) => set("state", e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select
            value={form.subscription_plan}
            onChange={(e) => set("subscription_plan", e.target.value as SubscriptionPlan)}
            className={inputCls}
          >
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
        </div>
      </div>

      <hr className="border-gray-100" />
      <p className="text-sm font-medium text-gray-800">Practice Admin invite (sent via AWS SES)</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin email</label>
          <input
            type="email"
            required
            value={form.admin_email}
            onChange={(e) => set("admin_email", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
          <input
            required
            value={form.admin_first_name}
            onChange={(e) => set("admin_first_name", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
          <input
            required
            value={form.admin_last_name}
            onChange={(e) => set("admin_last_name", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create & send invite"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm text-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
