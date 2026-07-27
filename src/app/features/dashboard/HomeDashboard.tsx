import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatCards } from "./StatCards";
import { AppointmentsTable } from "./AppointmentsTable";
import { IconButton } from "../../components/shared/IconButton";
import type { Appointment, Patient, AppointmentStatus } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { staffApi, mapAppointment } from "../../lib/staff-api";

export function HomeDashboard({ appointments, patients, onStatusChange, onOpenPanel }: {
  appointments: Appointment[]; patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenPanel: (p: Patient) => void;
}) {
  const { activeLocation } = useAuth();
  const [dateOffset, setDateOffset] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>(appointments);
  const displayDate = dateOffset === 0 ? "Today" : dateOffset === 1 ? "Tomorrow" : dateOffset === -1 ? "Yesterday" : dateOffset > 0 ? `+${dateOffset} days` : `${dateOffset} days`;

  useEffect(() => {
    staffApi.dashboard().then((s) => setWaitlistCount(s.waitlist_count)).catch(() => setWaitlistCount(0));
  }, []);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    staffApi.appointments
      .list(dateStr)
      .then((rows) => setDayAppointments(rows.map(mapAppointment)))
      .catch(() => setDayAppointments([]));
  }, [dateOffset, activeLocation?.id]);

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <StatCards />
      <div className="flex items-center gap-2">
        <IconButton label="Previous day" onClick={() => setDateOffset(d => d - 1)} className="p-1.5 rounded-md border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"><ChevronLeft size={16} /></IconButton>
        <IconButton label="Next day" onClick={() => setDateOffset(d => d + 1)} className="p-1.5 rounded-md border border-border bg-white hover:bg-gray-50 text-gray-500 transition-colors"><ChevronRight size={16} /></IconButton>
        <h2 className="text-xl font-semibold text-foreground">{displayDate}</h2>
      </div>
      {waitlistCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-lg border border-blue-200 border-l-4 border-l-sky-500 bg-blue-50 text-sm shadow-sm">
          <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <p className="text-gray-700 flex-1 leading-relaxed">
            You have <span className="font-semibold text-blue-700">{waitlistCount} patient{waitlistCount === 1 ? "" : "s"} on the waitlist</span> at this location.
          </p>
        </div>
      )}
      <AppointmentsTable appointments={dayAppointments} patients={patients} onStatusChange={onStatusChange} onOpenPanel={onOpenPanel} />
    </div>
  );
}
