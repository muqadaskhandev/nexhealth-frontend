import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronsUpDown, Search, Check } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import type { ApiLocation } from "../../lib/api";
import { formatLocationAddress } from "../../lib/locationFormat";
import { toastError, toastSuccess } from "../../lib/toast";

export function LocationPicker() {
  const { locations, activeLocation, switchLocation } = useAuth();
  const [open, setOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = locSearch.trim().toLowerCase();
  const filtered = locations.filter(
    (l) =>
      !query ||
      l.name.toLowerCase().includes(query) ||
      (l.address ?? "").toLowerCase().includes(query)
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setLocSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setLocSearch("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSelect(loc: ApiLocation) {
    if (loc.id === activeLocation?.id) {
      setOpen(false);
      setLocSearch("");
      return;
    }
    setSwitching(loc.id);
    try {
      await switchLocation(loc.id);
      toastSuccess(`Switched to ${loc.name}`);
      setOpen(false);
      setLocSearch("");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not switch location");
    } finally {
      setSwitching(null);
    }
  }

  // With only one (or no) location there is nothing to switch between — show a
  // static label, mirroring the product's behavior.
  const label = activeLocation?.name ?? "No location";
  const single = locations.length <= 1;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={single}
        onClick={() => {
          if (!single) setOpen((v) => !v);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm text-gray-700 font-medium transition-colors max-w-[280px] ${
          single
            ? "border-gray-200 cursor-default"
            : open
              ? "border-teal-400 bg-white ring-2 ring-teal-100"
              : "border-teal-300 hover:border-teal-400 hover:bg-gray-50"
        }`}
      >
        <MapPin size={14} className="text-teal-500 flex-shrink-0" />
        <span className="truncate">{label}</span>
        {!single && (
          <ChevronsUpDown size={14} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && !single && (
        <div
          role="listbox"
          aria-label="Locations"
          className="absolute top-full right-0 mt-2 w-[22rem] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-gray-900 mb-2">Locations</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-teal-400 bg-white">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-72 pb-2">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">
                No locations match “{locSearch.trim()}”
              </p>
            )}
            {filtered.map((loc) => {
              const active = loc.id === activeLocation?.id;
              const busy = switching === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={switching !== null}
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-start justify-between gap-3 px-4 py-3 transition-colors text-left disabled:opacity-60 ${
                    active ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {loc.name}
                      {busy ? "…" : ""}
                    </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    {formatLocationAddress(loc)}
                  </p>
                  </div>
                  {active && (
                    <Check size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
