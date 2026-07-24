import { useEffect, useState } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { usePractice } from "../../hooks/usePractice";
import { staffApi, mapProvider } from "../../lib/staff-api";
import { toastSuccess } from "../../lib/toast";
import { PreviewBookingModal } from "./PreviewBookingModal";
import type { AppointmentType, Provider } from "../../types";

const SWATCHES = [
  { name: "black", hex: "#111827" },
  { name: "red", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "green", hex: "#10b981" },
  { name: "blue", hex: "#3b82f6" },
  { name: "purple", hex: "#8b5cf6" },
];

function practiceSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") || "practice";
}

export function OnlineBookingLinksView({ types, onBack }: { types: AppointmentType[]; onBack: () => void }) {
  const { locations } = useAuth();
  const practice = usePractice(true);
  const [tab, setTab] = useState<"default" | "custom">("default");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [color, setColor] = useState(SWATCHES[0]);
  const [previewing, setPreviewing] = useState(false);

  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);

  useEffect(() => {
    staffApi.providers.list().then((rows) => setProviders(rows.map(mapProvider)));
  }, []);

  const slug = practiceSlug(practice?.name ?? "practice");
  // The link id represents the whole practice, not any single location — by
  // default the link is institution-wide (all locations/providers/appointment
  // types); only the Custom tab narrows it via the filter params below.
  const lid = practice?.id.slice(0, 8) ?? "000000";

  const params = new URLSearchParams({ lid });
  if (tab === "custom") {
    if (locationIds.length > 0) params.set("location_ids", locationIds.join(","));
    if (providerIds.length > 0) params.set("provider_ids", providerIds.join(","));
    if (typeIds.length > 0) params.set("appointment_type_ids", typeIds.join(","));
  }
  const link = `https://app.nexhealth.com/appt/${slug}?${params.toString()}`;
  const embedCode = `<a href="${link}" target="_blank" style="text-decoration: none;"><img alt="Book Now" src="https://frontend.assets.nexhealth.com/nexassets/book-now-button/button-${color.name}.svg" style="border: 0; margin: 0.25em;" /></a><script src="https://frontend.assets.nexhealth.com/scripts/NexHealth.min.js"></script>`;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toastSuccess(`${label} copied`);
  }

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none bg-gray-50";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} /> Appointment types
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Online booking links</h1>
      </div>
      <p className="text-sm text-gray-500">Share the online booking page by using simple links or conversion-analytics-enabled "Book Online" buttons.</p>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-4">
          {(["default", "custom"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-5">
          {tab === "custom" && (
            <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              Control which locations, providers, or appointment types people can schedule.
            </div>
          )}

          {tab === "custom" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Locations</label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {locations.map((loc) => (
                    <label key={loc.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={locationIds.includes(loc.id)} onChange={() => toggle(locationIds, setLocationIds, loc.id)} />
                      <span className="truncate">{loc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Providers</label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {providers.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">No providers yet.</p>
                  ) : (
                    providers.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={providerIds.includes(p.id)} onChange={() => toggle(providerIds, setProviderIds, p.id)} />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Appointment types</label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {types.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">No appointment types yet.</p>
                  ) : (
                    types.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={typeIds.includes(t.id)} onChange={() => toggle(typeIds, setTypeIds, t.id)} />
                        <span className="truncate">{t.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {tab === "default" ? `Basic online booking link for ${practice?.name ?? "your practice"}` : "Custom online booking link"}
            </p>
            <p className="text-xs text-gray-500 mb-2">Share your online booking page by sending this link.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={link} className={`${inputCls} flex-1 min-w-0`} />
              <div className="flex gap-2">
                <button
                  onClick={() => copy(link, "Link")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  <Copy size={14} /> Copy link
                </button>
                <button
                  onClick={() => setPreviewing(true)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Preview
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Conversion analytics button and link</p>
            <p className="text-xs text-gray-500 mb-3">Use on your website, landing pages, and other properties to track marketing efforts and booking conversion.</p>
            <div className="flex items-center gap-2 mb-3">
              {SWATCHES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setColor(s)}
                  title={s.name}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color.name === s.name ? "border-teal-500 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
            <div className="mb-3">
              <p className={labelCls}>Button preview</p>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: color.hex }}
              >
                Book Now <span className="opacity-75 text-xs">by NexHealth</span>
              </button>
            </div>
            <textarea readOnly value={embedCode} className={`${inputCls} min-h-[90px] font-mono text-xs`} />
            <button
              onClick={() => copy(embedCode, "Code")}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Copy size={14} /> Copy code
            </button>
          </div>
        </div>
      </div>

      {previewing && <PreviewBookingModal types={types} onClose={() => setPreviewing(false)} />}
    </div>
  );
}
