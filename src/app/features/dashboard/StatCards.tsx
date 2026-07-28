import { useEffect, useState } from "react";
import { CalendarCheck2, ClipboardList, Users } from "lucide-react";
import { staffApi } from "../../lib/staff-api";
import { useAuth } from "../../auth/AuthContext";
import { Skeleton } from "../../components/ui/skeleton";

type Stats = {
  appointments_today: number;
  confirmed_count: number;
  unconfirmed_count: number;
  waitlist_count: number;
  pending_forms: number;
  pending_payments: number;
};

function formatPeriodLabel(fromDate: string, toDate: string): string {
  if (!fromDate && !toDate) return "All appointments";
  if (fromDate && toDate && fromDate === toDate) {
    const d = new Date(`${fromDate}T12:00:00`);
    const today = new Date();
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    if (isToday) return "Today";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const start = fromDate || toDate;
  const end = toDate || fromDate;
  return `${fmt(start)} – ${fmt(end)}`;
}

export function StatCards({
  fromDate,
  toDate,
  refreshNonce = 0,
}: {
  fromDate: string;
  toDate: string;
  refreshNonce?: number;
}) {
  const { activeLocation } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const periodLabel = formatPeriodLabel(fromDate, toDate);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const opts =
      !fromDate && !toDate
        ? undefined
        : { startDate: fromDate || toDate, endDate: toDate || fromDate };

    staffApi
      .dashboard(opts)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLocation?.id, fromDate, toDate, refreshNonce]);

  const cards = [
    {
      id: "appointments",
      value: stats?.appointments_today ?? 0,
      label: "Appointments",
      hint: periodLabel,
      description: `${stats?.confirmed_count ?? 0} confirmed · ${stats?.unconfirmed_count ?? 0} unconfirmed`,
      icon: CalendarCheck2,
      accent: "from-teal-500 to-emerald-600",
      iconBg: "bg-teal-50 text-teal-600",
      ring: "ring-teal-100",
    },
    {
      id: "waitlist",
      value: stats?.waitlist_count ?? 0,
      label: "Waitlist",
      hint: "Active location",
      description: "Patients ready to fill open slots",
      icon: Users,
      accent: "from-sky-500 to-blue-600",
      iconBg: "bg-sky-50 text-sky-600",
      ring: "ring-sky-100",
    },
    {
      id: "pending",
      value: (stats?.pending_forms ?? 0) + (stats?.pending_payments ?? 0),
      label: "Forms & payments",
      hint: periodLabel,
      description: `${stats?.pending_forms ?? 0} incomplete forms · ${stats?.pending_payments ?? 0} pending payments`,
      icon: ClipboardList,
      accent: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-50 text-amber-600",
      ring: "ring-amber-100",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-16 bg-gray-100" />
                <Skeleton className="h-4 w-28 bg-gray-100" />
                <Skeleton className="h-3 w-20 bg-gray-100" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl bg-gray-100" />
            </div>
            <Skeleton className="h-3 w-full mt-4 bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ${card.ring} hover:shadow-md transition-shadow`}
          >
            <div
              className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08] ${card.accent}`}
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-bold text-gray-900 leading-none tabular-nums tracking-tight">
                  {card.value}
                </p>
                <p className="text-sm font-semibold text-gray-800 mt-2.5">{card.label}</p>
                <p className="text-xs font-medium text-teal-700/80 mt-0.5">{card.hint}</p>
              </div>
              <div className={`p-3 rounded-xl flex-shrink-0 ${card.iconBg}`}>
                <Icon size={22} strokeWidth={2} />
              </div>
            </div>
            <p className="relative text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100 leading-relaxed">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
