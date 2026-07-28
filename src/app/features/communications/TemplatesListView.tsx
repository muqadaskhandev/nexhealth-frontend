import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Cake,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  ListPlus,
  MessageSquareHeart,
  RefreshCw,
  Search,
  Star,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  mapCommunicationTemplate,
  staffApi,
} from "../../lib/staff-api";
import type { CommunicationTemplate } from "../../types";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        active ? "bg-emerald-500" : "bg-gray-300"
      }`}
      title={active ? "Active" : "Inactive"}
    />
  );
}

const TEMPLATE_ICON: Record<
  string,
  { icon: ReactNode; bg: string; color: string }
> = {
  "appointment-request": {
    icon: <CalendarPlus size={16} />,
    bg: "bg-indigo-100",
    color: "text-indigo-600",
  },
  "appointment-confirmed": {
    icon: <CalendarCheck size={16} />,
    bg: "bg-sky-100",
    color: "text-sky-600",
  },
  "appointment-rescheduled": {
    icon: <CalendarClock size={16} />,
    bg: "bg-violet-100",
    color: "text-violet-600",
  },
  "save-the-date": {
    icon: <Calendar size={16} />,
    bg: "bg-teal-100",
    color: "text-teal-600",
  },
  reminders: {
    icon: <Bell size={16} />,
    bg: "bg-emerald-100",
    color: "text-emerald-600",
  },
  missed: {
    icon: <XCircle size={16} />,
    bg: "bg-rose-100",
    color: "text-rose-600",
  },
  cancelled: {
    icon: <XCircle size={16} />,
    bg: "bg-rose-100",
    color: "text-rose-500",
  },
  reviews: {
    icon: <Star size={16} />,
    bg: "bg-cyan-100",
    color: "text-cyan-600",
  },
  "post-appointment-follow-up": {
    icon: <MessageSquareHeart size={16} />,
    bg: "bg-indigo-100",
    color: "text-indigo-600",
  },
  recalls: {
    icon: <RefreshCw size={16} />,
    bg: "bg-amber-100",
    color: "text-amber-600",
  },
  "new-patient": {
    icon: <UserPlus size={16} />,
    bg: "bg-sky-100",
    color: "text-sky-600",
  },
  birthday: {
    icon: <Cake size={16} />,
    bg: "bg-pink-100",
    color: "text-pink-600",
  },
  birthdays: {
    icon: <Cake size={16} />,
    bg: "bg-pink-100",
    color: "text-pink-600",
  },
  payments: {
    icon: <CreditCard size={16} />,
    bg: "bg-teal-100",
    color: "text-teal-600",
  },
  "waitlist-appointment": {
    icon: <ListPlus size={16} />,
    bg: "bg-violet-100",
    color: "text-violet-600",
  },
  "waitlist-continuing-care": {
    icon: <Users size={16} />,
    bg: "bg-violet-100",
    color: "text-violet-600",
  },
  "form-request": {
    icon: <ClipboardList size={16} />,
    bg: "bg-sky-100",
    color: "text-sky-600",
  },
  "form-reminders": {
    icon: <FileText size={16} />,
    bg: "bg-sky-100",
    color: "text-sky-600",
  },
  "form-reminder": {
    icon: <FileText size={16} />,
    bg: "bg-sky-100",
    color: "text-sky-600",
  },
};

function TemplateIcon({ slug }: { slug: string }) {
  const style = TEMPLATE_ICON[slug] ?? {
    icon: <CheckCircle2 size={16} />,
    bg: "bg-gray-100",
    color: "text-gray-500",
  };
  return (
    <span
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg} ${style.color}`}
    >
      {style.icon}
    </span>
  );
}

/** Display order matching NexHealth Templates overview. */
const SLUG_ORDER = [
  "appointment-request",
  "appointment-confirmed",
  "appointment-rescheduled",
  "save-the-date",
  "reminders",
  "missed",
  "cancelled",
  "reviews",
  "post-appointment-follow-up",
  "recalls",
  "new-patient",
  "birthday",
  "birthdays",
  "payments",
  "waitlist-appointment",
  "waitlist-continuing-care",
  "form-request",
  "form-reminders",
  "form-reminder",
];

export function TemplatesListView({
  onOpen,
}: {
  onOpen: (template: CommunicationTemplate) => void;
}) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setError(null);
    staffApi.communicationTemplates
      .list()
      .then((rows) => setTemplates(rows.map(mapCommunicationTemplate)))
      .catch(() =>
        setError(
          "Could not load templates. Make sure the backend is running and the database migration has been applied (cd backend && alembic upgrade head)."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates
    .filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      const ai = SLUG_ORDER.indexOf(a.slug);
      const bi = SLUG_ORDER.indexOf(b.slug);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return (
    <div className="px-4 sm:px-6 space-y-4">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
        To see who received an automation, open a template (or an appointment-type sequence under
        Custom), then choose the <span className="font-semibold">History</span> tab. Search by
        recipient and filter by date.
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-border rounded-xl max-w-md shadow-sm">
        <Search size={15} className="text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Locations</th>
                  <th className="px-4 py-3">Total sent</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onOpen(t)}
                    className="border-b border-border last:border-0 hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <StatusDot active={t.isActive} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <TemplateIcon slug={t.slug} />
                        <span className="font-medium text-teal-600 hover:text-teal-700 truncate">
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">
                      <div>{t.locationName || "—"}</div>
                      {t.multiLocation && (
                        <button
                          type="button"
                          className="text-xs text-teal-600 underline underline-offset-2 mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          and more locations
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">{t.totalSent}</td>
                    <td className="px-4 py-3.5 text-gray-700">{t.recipients}</td>
                    <td className="px-4 py-3.5 text-gray-500">{formatDate(t.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      <div>{formatDate(t.createdAt)}</div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      No templates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
