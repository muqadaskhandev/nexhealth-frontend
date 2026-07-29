import { useEffect, useRef, useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  MoreHorizontal,
  X,
} from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { StatusDropdown } from "../../components/shared/StatusDropdown";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { Appointment, Patient, AppointmentStatus } from "../../types";

type ManualOption = {
  step_id: string;
  template_id: string;
  title: string;
  kind: string;
  timing_label: string;
};

export function AppointmentsTable({
  appointments,
  patients,
  onStatusChange,
  onOpenPanel,
  showDate = false,
}: {
  appointments: Appointment[];
  patients: Patient[];
  onStatusChange: (id: string, status: AppointmentStatus) => void | Promise<void>;
  onOpenPanel: (p: Patient) => void;
  showDate?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "unconfirmed">("all");
  const [search, setSearch] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [manualFor, setManualFor] = useState<Appointment | null>(null);

  const filtered = appointments.filter((a) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "confirmed" && a.status === "confirmed") ||
      (activeTab === "unconfirmed" && a.status === "unconfirmed");
    const matchesSearch =
      !search || a.patient.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    all: appointments.length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    unconfirmed: appointments.filter((a) => a.status === "unconfirmed").length,
  };

  function formatApptDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm w-full h-full min-h-[60vh] flex flex-col">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", "confirmed", "unconfirmed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}{" "}
              <span className={`ml-0.5 ${activeTab === tab ? "opacity-80" : "opacity-60"}`}>
                ({counts[tab]})
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm text-gray-400 bg-white min-w-[180px]">
            <Search size={13} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter patients"
              className="outline-none bg-transparent text-gray-700 placeholder:text-gray-400 w-full min-w-0"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium bg-white">
            <Filter size={13} />
            Filter by
            <ChevronDown size={13} />
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
                <th
                  key={i}
                  className={`text-xs font-semibold text-muted-foreground whitespace-nowrap ${col.className}`}
                >
                  {col.label && (
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.label !== "" && <ChevronDown size={11} className="opacity-50" />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((appt) => {
              const fullPatient = patients.find((p) => p.id === appt.patientId);
              return (
                <tr
                  key={appt.id}
                  onClick={() => fullPatient && onOpenPanel(fullPatient)}
                  className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {showDate && (
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {formatApptDate(appt.startsAt)}
                      </div>
                    )}
                    <div className="font-medium text-foreground">{appt.time}</div>
                    <div className="text-xs text-muted-foreground">{appt.duration}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown
                      appointmentId={appt.id}
                      status={appt.status}
                      onStatusChange={onStatusChange}
                    />
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
                    <div
                      className={`text-foreground ${appt.contact.redacted ? "blur-[4px] select-none" : ""}`}
                    >
                      {appt.contact.phone}
                    </div>
                    <div
                      className={`text-xs text-muted-foreground ${
                        appt.contact.redacted ? "blur-[4px] select-none" : ""
                      }`}
                    >
                      {appt.contact.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-foreground">{appt.details.provider}</div>
                    <div className="text-xs text-muted-foreground">{appt.details.type}</div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {appt.insurance === "pending" ? (
                      <Clock size={16} className="text-gray-400 mx-auto" />
                    ) : (
                      <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {appt.forms === "complete" ? (
                      <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                    ) : (
                      <AlertCircle size={16} className="text-amber-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        title="Details"
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                      >
                        <Info size={14} />
                      </button>
                      <button
                        title="More"
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                        onClick={() => setMenuFor(menuFor === appt.id ? null : appt.id)}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                    {menuFor === appt.id && (
                      <div className="absolute right-3 top-10 z-20 w-52 rounded-lg border border-border bg-white shadow-lg py-1 text-left">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          onClick={() => {
                            setMenuFor(null);
                            setManualFor(appt);
                          }}
                        >
                          Send a manual template
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {manualFor && (
        <ManualReminderModal appointment={manualFor} onClose={() => setManualFor(null)} />
      )}
    </div>
  );
}

function ManualReminderModal({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<ManualOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    staffApi.reminders
      .manualOptions(appointment.id)
      .then((rows) => {
        setOptions(rows);
        setSelected(rows[0]?.step_id || "");
      })
      .catch(() => {
        toastError("Could not load reminder templates.");
        setOptions([]);
      })
      .finally(() => setLoading(false));
  }, [appointment.id]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedOption = options.find((o) => o.step_id === selected);

  async function send() {
    if (!selected) return;
    setSending(true);
    try {
      await staffApi.reminders.manualSend({
        appointment_id: appointment.id,
        step_id: selected,
      });
      toastSuccess("Reminder sent. Automated reminders will still continue to send as normal.");
      onClose();
    } catch {
      toastError("Could not send reminder.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-gray-900 text-sm">Automated messages for this appointment</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Appointment reminder</span>
            <span className="inline-flex h-5 w-9 items-center rounded-full bg-teal-500 px-0.5">
              <span className="h-4 w-4 rounded-full bg-white translate-x-4" />
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Send a manual template</p>
            {loading ? (
              <p className="text-xs text-gray-400">Loading templates…</p>
            ) : (
              <div className="relative" ref={ref}>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-teal-400 rounded-lg text-sm text-gray-800 bg-white"
                >
                  <span>{selectedOption?.title || "Select reminder"}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {open && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-auto">
                    {options.map((opt) => (
                      <button
                        key={`${opt.step_id}-${opt.title}`}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        onClick={() => {
                          setSelected(opt.step_id);
                          setOpen(false);
                        }}
                      >
                        {opt.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedOption && (
              <p className="text-xs text-gray-500 mt-2">
                Your <span className="font-medium">{selectedOption.title}</span> will send immediately.
                Any scheduled reminders will continue to send.
              </p>
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <button
            type="button"
            disabled={!selected || sending || loading}
            onClick={send}
            className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
