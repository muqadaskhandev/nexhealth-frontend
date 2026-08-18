import { useState } from "react";
import { Search, Filter, ChevronDown, Clock, CheckCircle2, AlertCircle, Info, MoreHorizontal } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { StatusDropdown } from "../../components/shared/StatusDropdown";
import type { Appointment, Patient, AppointmentStatus } from "../../types";

export function AppointmentsTable({ appointments, patients, onStatusChange, onOpenPanel, onOpenDetails, showDate = false }: {
  appointments: Appointment[]; patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void | Promise<void>;
  onOpenPanel: (p: Patient) => void;
  onOpenDetails?: (appt: Appointment) => void;
  showDate?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "unconfirmed">("all");
  const [search, setSearch] = useState("");

  const filtered = appointments.filter(a => {
    const matchesTab = activeTab === "all" || (activeTab === "confirmed" && a.status === "confirmed") || (activeTab === "unconfirmed" && a.status === "unconfirmed");
    const matchesSearch = !search || a.patient.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    all: appointments.length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    unconfirmed: appointments.filter(a => a.status === "unconfirmed").length,
  };

  function formatApptDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm w-full h-full min-h-[60vh] flex flex-col">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", "confirmed", "unconfirmed"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} <span className={`ml-0.5 ${activeTab === tab ? "opacity-80" : "opacity-60"}`}>({counts[tab]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm text-gray-400 bg-white min-w-[180px]">
            <Search size={13} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter patients" className="outline-none bg-transparent text-gray-700 placeholder:text-gray-400 w-full min-w-0" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium bg-white">
            <Filter size={13} />Filter by<ChevronDown size={13} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/80">
              {[
                { label: "Time", className: "text-left px-4 py-2.5" },
                { label: "Status", className: "text-left px-4 py-2.5" },
                { label: "Patient", className: "text-left px-4 py-2.5 min-w-[200px]" },
                { label: "Contact", className: "text-left px-4 py-2.5 min-w-[180px]" },
                { label: "Details", className: "text-left px-4 py-2.5" },
                { label: "Insurance", className: "text-center px-2 py-2.5 w-24" },
                { label: "Forms", className: "text-center px-2 py-2.5 w-24" },
                { label: "", className: "text-right px-3 py-2.5 w-16" },
              ].map((col, i) => (
                <th key={i} className={`text-xs font-semibold text-muted-foreground whitespace-nowrap ${col.className}`}>
                  {col.label && <span className="inline-flex items-center gap-1">{col.label}{col.label !== "" && <ChevronDown size={11} className="opacity-50" />}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(appt => {
              const fullPatient = patients.find(p => p.id === appt.patientId);
              return (
                <tr
                  key={appt.id}
                  onClick={() => fullPatient && onOpenPanel(fullPatient)}
                  className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {showDate && (
                      <div className="text-xs text-muted-foreground mb-0.5">{formatApptDate(appt.startsAt)}</div>
                    )}
                    <div className="font-medium text-foreground">{appt.time}</div>
                    <div className="text-xs text-muted-foreground">{appt.duration}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <StatusDropdown appointmentId={appt.id} status={appt.status} onStatusChange={onStatusChange} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <PatientAvatar initials={appt.patient.initials} color={appt.patient.color} />
                      <div>
                        <div className="font-medium text-foreground">{appt.patient.name}</div>
                        <div className="text-xs text-muted-foreground">{appt.patient.dob}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-foreground ${appt.contact.redacted ? "blur-[4px] select-none" : ""}`}>{appt.contact.phone}</div>
                    <div className={`text-xs text-muted-foreground ${appt.contact.redacted ? "blur-[4px] select-none" : ""}`}>{appt.contact.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-foreground">{appt.details.provider}</div>
                    <div className="text-xs text-muted-foreground">{appt.details.type}</div>
                    {appt.details.visitReason && (
                      <div className="text-xs text-teal-700 mt-0.5">Visit: {appt.details.visitReason}</div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {appt.insurance === "pending" ? <Clock size={16} className="text-gray-400 mx-auto" /> : <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {appt.forms === "complete" ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> : <AlertCircle size={16} className="text-amber-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Details"
                        onClick={() => onOpenDetails?.(appt)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
                      >
                        <Info size={14} />
                      </button>
                      <button title="More" className="p-1 rounded hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
