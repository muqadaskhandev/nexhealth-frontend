import { useState, useRef, useEffect } from "react";
import { Search, X, MessageSquare, FileText, DollarSign } from "lucide-react";
import { PatientAvatar } from "../shared/PatientAvatar";
import { IconButton } from "../shared/IconButton";
import { staffApi, mapPatient } from "../../lib/staff-api";
import type { Patient } from "../../types";

export function GlobalSearch({ onSelectPatient }: { onSelectPatient: (patient: Patient) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      // Practice-wide, not scoped to the currently active location — a
      // "global" search should find a patient regardless of which location
      // tab the staff member currently has selected.
      staffApi.patients
        .list(trimmed, false, true)
        .then((rows) => { if (!cancelled) { setResults(rows.map(mapPatient)); setError(null); } })
        .catch((err: { detail?: string }) => {
          if (cancelled) return;
          setResults([]);
          setError(err?.detail || "Search failed — try again");
        });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectPatient(patient: Patient) {
    onSelectPatient(patient);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className={`flex items-center gap-2 px-3 py-2 bg-white rounded-full border transition-all ${open ? "border-gray-300 shadow-md" : "border-gray-200 hover:border-gray-300"}`}>
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search patients" className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
        {query ? (
          <IconButton label="Clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 hover:bg-gray-500 transition-colors"><X size={11} className="text-white" /></IconButton>
        ) : (
          <span className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 font-mono flex-shrink-0">⌘K</span>
        )}
      </div>
      {open && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {error ? (
            <p className="px-4 py-6 text-center text-sm text-red-500">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No patients found for "{query.trim()}"</p>
          ) : null}
          {results.map(patient => (
            <div key={patient.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => selectPatient(patient)}>
              <PatientAvatar initials={patient.initials} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{patient.firstName} {patient.lastName}</p>
                <p className="text-sm text-gray-500">{patient.dob}</p>
                <p className="text-sm text-gray-500">{patient.phone}</p>
                <p className="text-sm text-gray-500">{patient.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button title="Message" onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><MessageSquare size={16} /></button>
                <button title="Form" onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><FileText size={16} /></button>
                <button title="Payment" onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><DollarSign size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
