import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import type { AppointmentStatus } from "../../types";

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  unconfirmed: ["confirmed", "checked-in", "cancelled"],
  confirmed:   ["checked-in", "cancelled"],
  "checked-in": ["cancelled"],
  cancelled:   [],
};

const STATUS_META: Record<AppointmentStatus, { label: string; className: string; icon: ReactNode }> = {
  "checked-in": { label: "Checked in",  className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300", icon: <CheckCircle2 size={11} /> },
  confirmed:    { label: "Confirmed",   className: "bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300",             icon: null },
  unconfirmed:  { label: "Unconfirmed", className: "bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300",            icon: null },
  cancelled:    { label: "Cancelled",   className: "bg-red-50 text-red-600 border-red-200",                                      icon: <XCircle size={11} /> },
};

export function StatusDropdown({ appointmentId, status, onStatusChange }: {
  appointmentId: string; status: AppointmentStatus;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[status];
  const transitions = ALLOWED_TRANSITIONS[status];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!transitions.length) {
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.className}`}>{meta.label}{meta.icon}</span>;
  }
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${meta.className}`}>
        {meta.label}{meta.icon}<ChevronDown size={10} className="ml-0.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Change status to</p>
          {transitions.map(next => {
            const m = STATUS_META[next];
            return (
              <button key={next} onClick={() => { onStatusChange(appointmentId, next); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.className}`}>{m.label}{m.icon}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
