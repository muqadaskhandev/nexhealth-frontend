import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";

export type SmsRegistrationRow = {
  id: string;
  location_id: string;
  status: string;
  legal_business_name: string;
  ein: string;
  dba_name: string;
  business_type: string;
  business_address: string;
  business_city: string;
  business_state: string;
  business_zip: string;
  business_phone: string;
  business_website: string;
  auth_rep_name: string;
  auth_rep_email: string;
  auth_rep_phone: string;
  auth_rep_title: string;
  request_office_number_hosting: boolean;
  office_phone_number: string;
  failure_reason: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
  sms_enabled: boolean;
};

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white disabled:bg-gray-50 disabled:text-gray-500";

const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: "Why do I need to register?",
    a: (
      <p>
        Practices benefit from improved message deliverability and a lower risk of messages being
        filtered as spam by phone carriers (e.g. T-Mobile).
      </p>
    ),
  },
  {
    q: "What happens if I do not register?",
    a: (
      <p>
        Due to national compliance requirements, failure to register your practice information{" "}
        <strong>will result in all of your patient SMS messages failing to be delivered.</strong>
      </p>
    ),
  },
  {
    q: "What is an authorized representative?",
    a: (
      <p>
        An authorized representative is a point of contact for an organization regarding your
        registration. Occasionally, our messaging provider may contact the authorized representative
        to verify information during the registration process, so it is important to provide accurate
        information.
      </p>
    ),
  },
  {
    q: 'Why am I seeing my registration status as still "In Progress" after several days have already passed?',
    a: (
      <p>
        If there is a discrepancy with the information initially provided (e.g. the EIN and Full
        legal business name do not match what is on file with the IRS), a manual review may be
        required which can take up to 7 days.
      </p>
    ),
  },
  {
    q: "What happens if my registration fails?",
    a: (
      <p>
        NexHealth will reach out to assist with verifying you have entered the correct information
        and help you resubmit your registration.
      </p>
    ),
  },
  {
    q: "What if I want to use our office phone number?",
    a: (
      <div className="space-y-2">
        <p>
          NexHealth may be able to host your office number so SMS messages come from that number.
          However, it is important to note two things:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            This is not always possible due to who currently has the &quot;rights&quot; to the number.
            If you are using a different service for telephony, that company must grant the transfer
            of the SMS rights to NexHealth, and that is occasionally a challenge.
          </li>
          <li>
            Even when NexHealth hosts your office number for texts, not ALL texts will come from that
            number. To ensure optimal deliverability, and maximum flexibility when it comes to
            patients unsubscribing from texts, Campaigns and Review messages will always come from
            different numbers.
          </li>
        </ol>
      </div>
    ),
  },
];

function statusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "in_progress":
      return "In Progress";
    case "failed":
      return "Failed";
    default:
      return "Not started";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "in_progress":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "failed":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      <h3 className="text-base font-bold text-gray-900">Frequently Asked Questions</h3>
      <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-white">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                {isOpen ? (
                  <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SmsRegistrationSettingsPanel() {
  const { activeLocation } = useAuth();
  const [row, setRow] = useState<SmsRegistrationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<SmsRegistrationRow>>({});

  const locked = row?.status === "in_progress" || row?.status === "approved";
  const canEdit = row?.status === "not_started" || row?.status === "failed";

  async function load() {
    const data = await staffApi.smsRegistration.get();
    setRow(data);
    setForm(data);
  }

  useEffect(() => {
    setLoading(true);
    void load()
      .catch(() => toastError("Could not load SMS registration."))
      .finally(() => setLoading(false));
  }, [activeLocation?.id]);

  function setField<K extends keyof SmsRegistrationRow>(key: K, value: SmsRegistrationRow[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveDraft(e?: FormEvent) {
    e?.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const updated = await staffApi.smsRegistration.update({
        legal_business_name: form.legal_business_name,
        ein: form.ein,
        dba_name: form.dba_name,
        business_type: form.business_type,
        business_address: form.business_address,
        business_city: form.business_city,
        business_state: form.business_state,
        business_zip: form.business_zip,
        business_phone: form.business_phone,
        business_website: form.business_website,
        auth_rep_name: form.auth_rep_name,
        auth_rep_email: form.auth_rep_email,
        auth_rep_phone: form.auth_rep_phone,
        auth_rep_title: form.auth_rep_title,
        request_office_number_hosting: form.request_office_number_hosting,
        office_phone_number: form.office_phone_number,
      });
      setRow(updated);
      setForm(updated);
      toastSuccess("Registration saved");
    } catch {
      toastError("Could not save registration.");
    } finally {
      setSaving(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      await staffApi.smsRegistration.update({
        legal_business_name: form.legal_business_name,
        ein: form.ein,
        dba_name: form.dba_name,
        business_type: form.business_type,
        business_address: form.business_address,
        business_city: form.business_city,
        business_state: form.business_state,
        business_zip: form.business_zip,
        business_phone: form.business_phone,
        business_website: form.business_website,
        auth_rep_name: form.auth_rep_name,
        auth_rep_email: form.auth_rep_email,
        auth_rep_phone: form.auth_rep_phone,
        auth_rep_title: form.auth_rep_title,
        request_office_number_hosting: form.request_office_number_hosting,
        office_phone_number: form.office_phone_number,
      });
      const updated = await staffApi.smsRegistration.submit();
      setRow(updated);
      setForm(updated);
      toastSuccess("Registration submitted — status is In Progress");
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "detail" in err
          ? String((err as { detail: unknown }).detail)
          : "Could not submit registration.";
      toastError(detail);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading SMS registration…</p>;
  }
  if (!row) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">SMS registration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Register your business information to send texts from NexHealth. When a service like
          NexHealth sends text messages on behalf of a business, there are special rules in place to
          prevent spam. To avoid your texts being blocked, you will need to register your business.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass(
            row.status
          )}`}
        >
          Status: {statusLabel(row.status)}
        </span>
        {row.sms_enabled ? (
          <span className="text-xs text-emerald-700 font-medium">Patient SMS delivery enabled</span>
        ) : (
          <span className="text-xs text-rose-700 font-medium">
            Patient SMS will fail until registration is approved
          </span>
        )}
      </div>

      {row.status === "in_progress" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Your registration is <strong>In Progress</strong>. If the EIN and full legal business name
          do not match IRS records, a manual review may take up to 7 days.
        </div>
      )}

      {row.status === "failed" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950 space-y-1">
          <p>
            <strong>Registration failed.</strong> NexHealth will help you verify the information and
            resubmit.
          </p>
          {row.failure_reason && <p className="text-rose-800">{row.failure_reason}</p>}
        </div>
      )}

      {row.status === "approved" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Your business is registered. Patient SMS messages can be delivered for this location.
        </div>
      )}

      <form onSubmit={(e) => void submit(e)} className="space-y-5">
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-gray-900 text-sm">Business details</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Be sure that your Business details, especially your full legal business name and EIN,
              match exactly what is on your tax documentation.
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Full legal business name *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.legal_business_name || ""}
                onChange={(e) => setField("legal_business_name", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">EIN *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.ein || ""}
                onChange={(e) => setField("ein", e.target.value)}
                placeholder="XX-XXXXXXX"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">DBA / trade name</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.dba_name || ""}
                onChange={(e) => setField("dba_name", e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Business type</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.business_type || ""}
                onChange={(e) => setField("business_type", e.target.value)}
                placeholder="LLC, Corporation, Sole proprietor…"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Business address *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.business_address || ""}
                onChange={(e) => setField("business_address", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">City *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.business_city || ""}
                onChange={(e) => setField("business_city", e.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">State *</span>
                <input
                  className={inputCls}
                  disabled={locked}
                  value={form.business_state || ""}
                  onChange={(e) => setField("business_state", e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">ZIP *</span>
                <input
                  className={inputCls}
                  disabled={locked}
                  value={form.business_zip || ""}
                  onChange={(e) => setField("business_zip", e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Business phone *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.business_phone || ""}
                onChange={(e) => setField("business_phone", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Website</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.business_website || ""}
                onChange={(e) => setField("business_website", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-gray-900 text-sm">Authorized representative</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Point of contact our messaging provider may reach to verify registration information.
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Full name *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.auth_rep_name || ""}
                onChange={(e) => setField("auth_rep_name", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Title / role *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.auth_rep_title || ""}
                onChange={(e) => setField("auth_rep_title", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email *</span>
              <input
                type="email"
                className={inputCls}
                disabled={locked}
                value={form.auth_rep_email || ""}
                onChange={(e) => setField("auth_rep_email", e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Phone *</span>
              <input
                className={inputCls}
                disabled={locked}
                value={form.auth_rep_phone || ""}
                onChange={(e) => setField("auth_rep_phone", e.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-gray-900 text-sm">Office phone number</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Optionally request that NexHealth host your office number for SMS. Campaigns and Review
              messages will still use different numbers for deliverability.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                disabled={locked}
                checked={Boolean(form.request_office_number_hosting)}
                onChange={(e) => setField("request_office_number_hosting", e.target.checked)}
              />
              Request hosting our office phone number for SMS
            </label>
            {form.request_office_number_hosting && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Office phone number</span>
                <input
                  className={inputCls}
                  disabled={locked}
                  value={form.office_phone_number || ""}
                  onChange={(e) => setField("office_phone_number", e.target.value)}
                />
              </label>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="px-4 py-2 text-sm font-medium text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
            >
              {row.status === "failed" ? "Resubmit registration" : "Submit registration"}
            </button>
          </div>
        )}
      </form>

      {(row.status === "in_progress" || row.status === "failed") && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Demo controls</p>
          <p className="text-sm text-gray-600">
            Simulate carrier review outcome (approve or fail) for this location.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium text-emerald-800 bg-emerald-100 rounded-lg hover:bg-emerald-200"
              onClick={() => {
                void staffApi.smsRegistration
                  .setStatus({ status: "approved" })
                  .then((updated) => {
                    setRow(updated);
                    setForm(updated);
                    toastSuccess("Registration approved");
                  })
                  .catch(() => toastError("Could not update status."));
              }}
            >
              Mark approved
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium text-rose-800 bg-rose-100 rounded-lg hover:bg-rose-200"
              onClick={() => {
                void staffApi.smsRegistration
                  .setStatus({
                    status: "failed",
                    failure_reason:
                      "EIN and full legal business name do not match IRS records. Please correct and resubmit.",
                  })
                  .then((updated) => {
                    setRow(updated);
                    setForm(updated);
                    toastSuccess("Registration marked failed");
                  })
                  .catch(() => toastError("Could not update status."));
              }}
            >
              Mark failed
            </button>
          </div>
        </div>
      )}

      <FaqAccordion />
    </div>
  );
}

/** Thin blue ribbon shown on Home when SMS registration is incomplete. */
export function SmsRegistrationBanner({ onStart }: { onStart: () => void }) {
  const { activeLocation } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    staffApi.smsRegistration
      .get()
      .then((row) => {
        if (!cancelled) setVisible(row.status !== "approved");
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLocation?.id]);

  if (!visible) return null;

  return (
    <div className="w-full bg-[#5B6FE8] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="min-w-0">
        To send text messages to patients, you must register your business to meet compliance
        requirements.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="flex-shrink-0 px-3 py-1.5 rounded-md bg-white/95 text-[#3D4DB8] text-sm font-semibold hover:bg-white shadow-sm"
      >
        Start Registration
      </button>
    </div>
  );
}
