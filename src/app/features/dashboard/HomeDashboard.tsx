import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { StatCards } from "./StatCards";
import { AppointmentsTable } from "./AppointmentsTable";
import type { Appointment, Patient, AppointmentStatus } from "../../types";

export function HomeDashboard({ appointments, patients, onStatusChange, onOpenPanel }: {
  appointments: Appointment[]; patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenPanel: (p: Patient) => void;
}) {
  const [dateOffset, setDateOffset] = useState(0);
  const displayDate = dateOffset === 0 ? "Today" : dateOffset === 1 ? "Tomorrow" : dateOffset === -1 ? "Yesterday" : dateOffset > 0 ? `+${dateOffset} days` : `${dateOffset} days`;

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <StatCards />
      <div className="flex items-center gap-2">
        <button onClick={() => setDateOffset(d => d - 1)} className="p-1.5 rounded-md border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
        <button onClick={() => setDateOffset(d => d + 1)} className="p-1.5 rounded-md border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"><ChevronRight size={16} /></button>
        <h2 className="text-xl font-semibold text-foreground">{displayDate}</h2>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-lg border border-blue-200 border-l-4 border-l-sky-500 bg-blue-50 text-sm shadow-sm">
        <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <p className="text-gray-700 flex-1 leading-relaxed">
          You have <span className="font-semibold text-blue-700">6 open slots</span> in the next 5 days. Fill open slots in minutes by sending a waitlist request.
        </p>
        <button className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors whitespace-nowrap self-start sm:self-auto">
          Fill open slots <ArrowRight size={14} />
        </button>
      </div>
      <AppointmentsTable appointments={appointments} patients={patients} onStatusChange={onStatusChange} onOpenPanel={onOpenPanel} />
    </div>
  );
}
