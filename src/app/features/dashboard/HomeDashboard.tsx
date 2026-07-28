import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { StatCards } from "./StatCards";
import { AppointmentsTable } from "./AppointmentsTable";
import type { Appointment, Patient, AppointmentStatus } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { staffApi, mapAppointment } from "../../lib/staff-api";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HomeDashboard({ appointments, patients, onStatusChange, onOpenPanel }: {
  appointments: Appointment[]; patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenPanel: (p: Patient) => void;
}) {
  const { activeLocation } = useAuth();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [rangeAppointments, setRangeAppointments] = useState<Appointment[]>(appointments);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const hasDateFilter = Boolean(fromDate || toDate);
  const showDateColumn = !hasDateFilter || fromDate !== toDate;

  useEffect(() => {
    staffApi.dashboard().then((s) => setWaitlistCount(s.waitlist_count)).catch(() => setWaitlistCount(0));
  }, [activeLocation?.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingAppointments(true);

    const listOpts =
      !fromDate && !toDate
        ? {}
        : {
            startDate: fromDate || toDate,
            endDate: toDate || fromDate,
          };

    staffApi.appointments
      .list(listOpts)
      .then((rows) => {
        if (!cancelled) setRangeAppointments(rows.map(mapAppointment));
      })
      .catch(() => {
        if (!cancelled) setRangeAppointments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAppointments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, activeLocation?.id]);

  function setToday() {
    const t = todayIso();
    setFromDate(t);
    setToDate(t);
  }

  function clearDates() {
    setFromDate("");
    setToDate("");
  }

  const inputCls =
    "px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <StatCards />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-gray-700 pb-2">
            <CalendarRange size={18} className="text-teal-600" />
            <span className="text-sm font-semibold">Appointments</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={setToday}
            className="px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            Today
          </button>
          {hasDateFilter && (
            <button
              type="button"
              onClick={clearDates}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Show all
            </button>
          )}
        </div>
        {!loadingAppointments && (
          <p className="text-xs text-gray-500 pb-2">
            {rangeAppointments.length} appointment{rangeAppointments.length === 1 ? "" : "s"}
            {hasDateFilter ? " in range" : " total"}
          </p>
        )}
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
      {loadingAppointments ? (
        <div className="bg-white rounded-lg border border-border px-4 py-12 text-center text-sm text-gray-400">
          Loading appointments…
        </div>
      ) : (
        <AppointmentsTable
          appointments={rangeAppointments}
          patients={patients}
          onStatusChange={onStatusChange}
          onOpenPanel={onOpenPanel}
          showDate={showDateColumn}
        />
      )}
    </div>
  );
}
