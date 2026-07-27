import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CircleDollarSign,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  StickyNote,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import type { ActivityType, Patient } from "../../types";
import { LoadingBounce } from "../../components/shared/LoadingBounce";

type FeedItem = {
  id: string;
  patientId: string;
  patientName: string;
  type: ActivityType;
  title: string;
  body: string;
  createdAt: string;
};

const ACTIVITY_ICON: Record<ActivityType, typeof Calendar> = {
  appointment: Calendar,
  message: MessageSquare,
  form: FileText,
  payment: CircleDollarSign,
  verification: ShieldCheck,
  note: StickyNote,
};

const TYPE_LABEL: Record<ActivityType, string> = {
  appointment: "Appointment",
  message: "Message",
  form: "Form",
  payment: "Payment",
  verification: "Verification",
  note: "Note",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityView({
  patients,
  onOpenPanel,
}: {
  patients: Patient[];
  onOpenPanel: (p: Patient) => void;
}) {
  const { activeLocation } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ActivityType>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    staffApi
      .activity()
      .then((rows) => {
        if (cancelled) return;
        setItems(
          rows.map((r) => ({
            id: r.id,
            patientId: r.patient_id,
            patientName: r.patient_name,
            type: r.activity_type as ActivityType,
            title: r.title,
            body: r.body,
            createdAt: r.created_at,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLocation?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!q) return true;
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
      );
    });
  }, [items, search, typeFilter]);

  function openPatient(patientId: string) {
    const p = patients.find((x) => x.id === patientId);
    if (p) onOpenPanel(p);
  }

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            Recent patient events at {activeLocation?.name ?? "this location"}.
          </p>
        </div>
        <p className="text-xs text-gray-400 font-medium tabular-nums">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-border rounded-xl flex-1 max-w-md shadow-sm">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or event…"
            className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "appointment", "form", "message", "payment", "verification", "note"] as const).map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  typeFilter === t
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                {t === "all" ? "All" : TYPE_LABEL[t]}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingBounce />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700">No activity yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Appointments, forms, messages, and payments will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <ul className="divide-y divide-border">
            {filtered.map((item) => {
              const Icon = ACTIVITY_ICON[item.type] ?? StickyNote;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openPatient(item.patientId)}
                    className="w-full text-left flex items-start gap-3.5 px-5 py-4 hover:bg-teal-50/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                      <Icon size={17} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.patientName}
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5">{item.title}</p>
                          {item.body && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                            {TYPE_LABEL[item.type] ?? item.type}
                          </span>
                          <p className="text-xs text-gray-400 mt-1.5 tabular-nums">
                            {formatWhen(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
