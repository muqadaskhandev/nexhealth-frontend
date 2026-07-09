import { useState, useRef, useEffect } from "react";
import { Search, X, MessageSquare, FileText, DollarSign } from "lucide-react";
import { PatientAvatar } from "../shared/PatientAvatar";
import type { PatientResult } from "../../types";

const PATIENT_RESULTS: PatientResult[] = [
  { id: "hs", name: "Homer Simpson", dob: "December 17, 1962", phone: "(555) 555-5555", email: "homer.simpson@email.com", initials: "HS" },
  { id: "ms", name: "Marge Simpson", dob: "October 1, 1956",   phone: "(555) 555-5556", email: "marge.simpson@email.com", initials: "MS" },
  { id: "bs", name: "Bart Simpson",  dob: "April 1, 1980",     phone: "(555) 555-5557", email: "bart.simpson@email.com",  initials: "BS" },
  { id: "ls", name: "Lisa Simpson",  dob: "May 9, 1984",       phone: "(555) 555-5558", email: "lisa.simpson@email.com",  initials: "LS" },
  { id: "nf", name: "Ned Flanders",  dob: "November 9, 1952",  phone: "(555) 555-5559", email: "ned.flanders@email.com",  initials: "NF" },
];

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length > 0
    ? PATIENT_RESULTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : [];

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

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className={`flex items-center gap-2 px-3 py-2 bg-white rounded-full border transition-all ${open ? "border-gray-300 shadow-md" : "border-gray-200 hover:border-gray-300"}`}>
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search patients" className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
        {query ? (
          <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 hover:bg-gray-500 transition-colors"><X size={11} className="text-white" /></button>
        ) : (
          <span className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400 font-mono flex-shrink-0">⌘K</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {results.map(patient => (
            <div key={patient.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => { setQuery(patient.name); setOpen(false); }}>
              <PatientAvatar initials={patient.initials} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{patient.name}</p>
                <p className="text-sm text-gray-500">{patient.dob}</p>
                <p className="text-sm text-gray-500">{patient.phone}</p>
                <p className="text-sm text-gray-500">{patient.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><MessageSquare size={16} /></button>
                <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><FileText size={16} /></button>
                <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-teal-600 hover:bg-teal-50"><DollarSign size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
