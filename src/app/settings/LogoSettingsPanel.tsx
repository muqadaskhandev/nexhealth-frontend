import { useEffect, useRef, useState, type DragEvent } from "react";
import { Copy, ImageIcon, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { practiceApi, type ApiLocation } from "../lib/api";
import { BrandLogo } from "../components/branding/BrandLogo";
import { toastError, toastSuccess } from "../lib/toast";

/**
 * Settings → Logo — upload / remove / copy logo for the active location,
 * with a preview that matches the top-left header placement.
 */
export function LogoSettingsPanel() {
  const { locations, activeLocation, refreshSession } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState<ApiLocation | null>(activeLocation);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyIds, setCopyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocation(activeLocation);
  }, [activeLocation]);

  const others = locations.filter((l) => l.id !== location?.id);
  const hasLogo = Boolean(location?.logo_url);

  async function onUpload(file: File | undefined) {
    if (!location || !file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      const msg = "Only PNG and JPG images are supported.";
      setError(msg);
      toastError(msg);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      const msg = "Logo must be under 2 MB.";
      setError(msg);
      toastError(msg);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await practiceApi.uploadLocationLogo(location.id, file);
      setLocation(updated);
      await refreshSession();
      toastSuccess("Logo uploaded");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not upload logo.";
      setError(msg);
      toastError(msg);
    } finally {
      setBusy(false);
      setDragging(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    if (!location?.logo_url) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await practiceApi.removeLocationLogo(location.id);
      setLocation(updated);
      await refreshSession();
      toastSuccess("Logo removed");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not remove logo.";
      setError(msg);
      toastError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!location || copyIds.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      await practiceApi.copyLocationLogo(location.id, [...copyIds]);
      await refreshSession();
      setCopyOpen(false);
      const count = copyIds.size;
      setCopyIds(new Set());
      toastSuccess(`Logo copied to ${count} location(s)`);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not copy logo.";
      setError(msg);
      toastError(msg);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void onUpload(e.dataTransfer.files?.[0]);
  }

  if (!location) {
    return (
      <p className="text-sm text-gray-500">
        Select a location from the top bar to manage its logo.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Logo</h2>
        <p className="text-sm text-gray-500 mt-1">
          Shown in the top-left of the app and to patients when booking or receiving emails.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Editing logo for <span className="font-medium text-gray-600">{location.name}</span>
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-gray-50/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Header preview
          </p>
        </div>
        <div className="h-16 px-5 flex items-center border-b border-border bg-white">
          <div className="flex items-center h-10 w-[180px]">
            <BrandLogo
              logoUrl={location.logo_url}
              alt={`${location.name} logo`}
              className="h-full w-full object-contain object-left"
            />
          </div>
          <div className="ml-4 h-8 flex-1 max-w-xs rounded-lg bg-gray-100" aria-hidden="true" />
        </div>

        <div className="p-5 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            className={`w-full rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors disabled:opacity-60 ${
              dragging
                ? "border-teal-400 bg-teal-50"
                : "border-gray-200 bg-gray-50/60 hover:border-teal-300 hover:bg-teal-50/40"
            }`}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 text-teal-600">
              {hasLogo ? <ImageIcon size={22} /> : <Upload size={22} />}
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {hasLogo ? "Replace logo" : "Upload logo"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop a PNG or JPG here, or click to browse
            </p>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60 whitespace-nowrap"
            >
              {busy ? "Working…" : hasLogo ? "Upload new logo" : "Upload logo"}
            </button>
            {hasLogo && (
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-60"
              >
                Remove logo
              </button>
            )}
          </div>

          <div className="rounded-lg bg-sky-50 border border-sky-100 px-3.5 py-3 text-xs text-sky-900 space-y-1">
            <p className="font-semibold">Logo tips</p>
            <p>
              PNG recommended · around 300×300 or a wide wordmark up to ~400×120 px · keep
              files under 2 MB · transparent backgrounds work best in the top-left header
            </p>
          </div>
        </div>
      </div>

      {hasLogo && others.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-900">
              Use this logo for other locations
            </h3>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Copy size={18} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">Copy to other locations</span>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCopyOpen(true)}
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 whitespace-nowrap"
            >
              Copy &gt;
            </button>
          </div>
        </div>
      )}

      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-gray-900">Copy logo</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select locations that should use this logo.
              </p>
            </div>
            <div className="px-5 py-3 max-h-64 overflow-y-auto space-y-2">
              {others.map((loc) => (
                <label key={loc.id} className="flex items-start gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyIds.has(loc.id)}
                    onChange={(e) => {
                      setCopyIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(loc.id);
                        else next.delete(loc.id);
                        return next;
                      });
                    }}
                    className="mt-1 rounded border-gray-300 text-teal-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{loc.name}</span>
                    <span className="block text-xs text-gray-500">{loc.address}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center gap-3">
              <button
                type="button"
                disabled={busy || copyIds.size === 0}
                onClick={onCopy}
                className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
              >
                Continue
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setCopyOpen(false);
                  setCopyIds(new Set());
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
