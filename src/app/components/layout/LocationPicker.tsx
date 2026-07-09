import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Search, Check } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import type { ApiLocation } from "../../lib/api";

export function LocationPicker() {
  const { locations, activeLocation, switchLocation } = useAuth();
  const [open, setOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = locations.filter(l => !locSearch || l.name.toLowerCase().includes(locSearch.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setLocSearch(""); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSelect(loc: ApiLocation) {
    if (loc.id === activeLocation?.id) { setOpen(false); setLocSearch(""); return; }
    setSwitching(loc.id);
    try {
      await switchLocation(loc.id);
      setOpen(false);
      setLocSearch("");
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
        onClick={() => { if (!single) setOpen(v => !v); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors font-medium"
      >
        <MapPin size={13} className="text-teal-500" />
        <span className="max-w-[200px] truncate">{label}</span>
        {!single && <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && !single && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-gray-900 mb-2">Locations</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-teal-400 bg-white">
              <Search size={13} className="text-gray-400" />
              <input autoFocus value={locSearch} onChange={e => setLocSearch(e.target.value)} placeholder="Search" className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-72 pb-2">
            {filtered.map(loc => (
              <button key={loc.id} disabled={switching !== null} onClick={() => handleSelect(loc)} className="w-full flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-60">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{loc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{loc.address}</p>
                </div>
                {loc.id === activeLocation?.id && <Check size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
