import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Users } from "lucide-react";
import { staffApi } from "../../lib/staff-api";

type Stats = {
  appointments_today: number;
  confirmed_count: number;
  waitlist_count: number;
  pending_forms: number;
  pending_payments: number;
};

export function StatCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    staffApi.dashboard().then(setStats).catch(() => setStats(null));
  }, []);

  const cards = [
    {
      id: "today",
      value: stats?.appointments_today ?? 0,
      label: "Appointments today",
      period: "Active location",
      description: `${stats?.confirmed_count ?? 0} confirmed`,
      color: "#d946ef",
      bg: "#fdf4ff",
      icon: <CheckCircle2 size={20} />,
    },
    {
      id: "waitlist",
      value: stats?.waitlist_count ?? 0,
      label: "Patients on waitlist",
      period: "Active location",
      description: "Ready to fill open slots",
      color: "#38bdf8",
      bg: "#f0f9ff",
      icon: <Users size={20} />,
    },
    {
      id: "pending",
      value: (stats?.pending_forms ?? 0) + (stats?.pending_payments ?? 0),
      label: "Pending forms & payments",
      period: "Active location",
      description: `${stats?.pending_forms ?? 0} forms · ${stats?.pending_payments ?? 0} payments`,
      color: "#fb923c",
      bg: "#fff7ed",
      icon: <Calendar size={20} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-card rounded-lg border border-border overflow-hidden shadow-sm"
          style={{ borderTop: `3px solid ${card.color}` }}
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-bold text-foreground leading-none">{card.value}</p>
                <p className="text-sm font-semibold text-gray-800 mt-2 leading-snug">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.period}</p>
              </div>
              <div
                className="p-2.5 rounded-lg flex-shrink-0"
                style={{ backgroundColor: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border leading-relaxed">
              {card.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
