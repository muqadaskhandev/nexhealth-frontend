import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Copy, ExternalLink, Plus } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { usePractice } from "../../hooks/usePractice";
import { practiceApi } from "../../lib/api";
import {
  buildBookingLink,
  buildConversionBookingLink,
  buildConversionEmbedCode,
} from "../../lib/public-booking-api";
import { staffApi, mapAppointmentType, mapProvider } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { ShareInstructionsModal } from "./ShareInstructionsModal";
import type { AppointmentType, Provider } from "../../types";

type ButtonColor = { name: string; hex: string; asset?: string };

const SWATCHES: ButtonColor[] = [
  { name: "grey", hex: "#6b7280", asset: "grey" },
  { name: "red", hex: "#ef4444", asset: "red" },
  { name: "orange", hex: "#f97316", asset: "orange" },
  { name: "yellow", hex: "#eab308", asset: "yellow" },
  { name: "green", hex: "#10b981", asset: "green" },
  { name: "blue", hex: "#3b82f6", asset: "blue" },
  { name: "purple", hex: "#8b5cf6", asset: "purple" },
  { name: "pink", hex: "#ec4899", asset: "pink" },
  { name: "black", hex: "#111827", asset: "black" },
];

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function OnlineBookingLinksView({
  types: typesProp,
  onBack,
  embedded = false,
}: {
  types?: AppointmentType[];
  onBack?: () => void;
  embedded?: boolean;
}) {
  const { locations, user } = useAuth();
  const practice = usePractice(true);
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<"default" | "custom">("default");
  const [types, setTypes] = useState<AppointmentType[]>(typesProp ?? []);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [color, setColor] = useState<ButtonColor>(SWATCHES[8]);
  const [customHex, setCustomHex] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [savingRedirect, setSavingRedirect] = useState(false);

  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);

  useEffect(() => {
    if (typesProp) setTypes(typesProp);
    else staffApi.appointmentTypes.list().then((rows) => setTypes(rows.map(mapAppointmentType)));
  }, [typesProp]);

  useEffect(() => {
    staffApi.providers.list().then((rows) => setProviders(rows.map(mapProvider)));
  }, []);

  useEffect(() => {
    setRedirectUrl(practice?.booking_redirect_url ?? "");
  }, [practice?.booking_redirect_url]);

  const linkParams: Record<string, string | undefined> = {};
  if (tab === "custom") {
    if (locationIds.length > 0) linkParams.location_ids = locationIds.join(",");
    if (providerIds.length > 0) linkParams.provider_ids = providerIds.join(",");
    if (typeIds.length > 0) linkParams.appointment_type_ids = typeIds.join(",");
  }

  const utmContent = tab === "custom" ? "custom_link" : "default_link";

  const basicLink = practice?.name
    ? buildBookingLink(practice.name, practice.id, linkParams)
    : `${window.location.origin}/appt/practice`;

  const conversionLink = practice?.name
    ? buildConversionBookingLink(practice.name, practice.id, linkParams, { content: utmContent })
    : basicLink;

  const activeHex = showCustomPicker && isValidHex(customHex) ? customHex : color.hex;
  const useCustomButton = showCustomPicker && isValidHex(customHex);

  const embedCode = useMemo(
    () => buildConversionEmbedCode(conversionLink, activeHex, useCustomButton ? undefined : color.asset),
    [conversionLink, activeHex, useCustomButton, color.asset]
  );

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toastSuccess(`${label} copied`);
  }

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  }

  function openPreview() {
    window.open(basicLink, "_blank", "noopener,noreferrer");
  }

  function applyCustomHex() {
    const normalized = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (!isValidHex(normalized)) {
      toastError("Enter a valid hex color like #ff5500");
      return;
    }
    setCustomHex(normalized);
    setShowCustomPicker(true);
    toastSuccess("Custom color applied");
  }

  async function saveRedirectUrl() {
    if (!isAdmin || savingRedirect) return;
    setSavingRedirect(true);
    try {
      await practiceApi.update({ booking_redirect_url: redirectUrl.trim() });
      toastSuccess("Post-booking redirect saved");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not save redirect URL — please try again.");
    } finally {
      setSavingRedirect(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none bg-gray-50";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  const rootCls = embedded ? "space-y-5" : "w-full min-w-0 px-4 sm:px-6 py-5 space-y-5";

  return (
    <div className={rootCls}>
      <div className="flex flex-wrap items-center gap-3">
        {!embedded && onBack && (
          <>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft size={15} /> Appointment types
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
          </>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Online booking links</h1>
      </div>
      <p className="text-sm text-gray-500">
        Share your booking page publicly with a simple link or a conversion-analytics-enabled &quot;Book Online&quot; button.
        Online booking links are publicly accessible — anyone with the link can book.
      </p>

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

        <div className="mx-4 sm:mx-5 mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm font-medium">Share instructions with the person who manages your website</p>
          <button
            onClick={() => setShowInstructions(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-blue-100 whitespace-nowrap"
          >
            Share instructions <ChevronRight size={14} />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-5">
          {tab === "custom" && (
            <>
              <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                Customize your link — control which locations, providers, or appointment types people can schedule.
              </div>
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
            </>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {tab === "default"
                ? `Basic online booking link for ${practice?.name ?? "your practice"}`
                : "Custom online booking link"}
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Best for text messages and social media where UTM tracking isn&apos;t needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={basicLink} className={`${inputCls} flex-1 min-w-0`} />
              <div className="flex gap-2">
                <button
                  onClick={() => copy(basicLink, "Link")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  <Copy size={14} /> Copy link
                </button>
                <button
                  onClick={openPreview}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Preview <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Conversion analytics button and link</p>
            <p className="text-xs text-gray-500 mb-3">
              Use on your website to track marketing efforts and booking conversion via UTM parameters
              (<code className="text-[11px] bg-gray-100 px-1 rounded">utm_source</code>,{" "}
              <code className="text-[11px] bg-gray-100 px-1 rounded">utm_medium</code>,{" "}
              <code className="text-[11px] bg-gray-100 px-1 rounded">utm_campaign</code>).
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {SWATCHES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setColor(s);
                    setShowCustomPicker(false);
                  }}
                  title={s.name}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                    !showCustomPicker && color.name === s.name ? "border-teal-500 scale-110" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: s.hex }}
                >
                  {!showCustomPicker && color.name === s.name && (
                    <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowCustomPicker(true)}
                title="Custom color"
                className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center text-gray-500 hover:border-teal-400 hover:text-teal-600 ${
                  showCustomPicker ? "border-teal-500 text-teal-600" : "border-gray-300"
                }`}
              >
                <Plus size={14} />
              </button>
            </div>
            {showCustomPicker && (
              <div className="flex flex-wrap items-end gap-2 mb-3">
                <div className="flex-1 min-w-[140px]">
                  <label className={labelCls}>Custom hex color</label>
                  <input
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    placeholder="#ff5500"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={applyCustomHex}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800"
                >
                  Apply
                </button>
              </div>
            )}
            <div className="mb-3">
              <p className={labelCls}>Button preview</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-sm"
                style={{ backgroundColor: activeHex }}
              >
                Book Now <span className="opacity-75 text-xs font-medium">by NexHealth</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1">Analytics link (includes UTM parameters):</p>
            <input readOnly value={conversionLink} className={`${inputCls} mb-3 text-xs`} />
            <textarea readOnly value={embedCode} className={`${inputCls} min-h-[90px] font-mono text-xs`} />
            <button
              onClick={() => copy(embedCode, "Code")}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Copy size={14} /> Copy code
            </button>
          </div>

          {isAdmin && (
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Post-booking redirect</p>
              <p className="text-xs text-gray-500">
                After patients complete a booking, send them back to your website (e.g. your homepage or a thank-you page).
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://www.yourpractice.com"
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={saveRedirectUrl}
                  disabled={savingRedirect}
                  className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
                >
                  {savingRedirect ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showInstructions && (
        <ShareInstructionsModal link={basicLink} embedCode={embedCode} onClose={() => setShowInstructions(false)} />
      )}
    </div>
  );
}
