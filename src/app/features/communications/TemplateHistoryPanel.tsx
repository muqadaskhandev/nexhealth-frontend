import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Mail, Search, Send } from "lucide-react";
import { staffApi } from "../../lib/staff-api";

export type TemplateHistoryRow = {
  id: string;
  template_id: string;
  patient_id: string | null;
  patient_name: string;
  patient_dob: string | null;
  communication_label: string;
  channel: string;
  sent_at: string;
  provider_name: string;
  appointment_at: string | null;
};

type DateFilter = "all" | "today" | "7d" | "30d" | "custom";

function formatDob(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatSent(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAppt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForFilter(filter: DateFilter): { sent_from?: string; sent_to?: string } {
  const now = new Date();
  const today = toYmd(now);
  if (filter === "today") return { sent_from: today, sent_to: today };
  if (filter === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { sent_from: toYmd(from), sent_to: today };
  }
  if (filter === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { sent_from: toYmd(from), sent_to: today };
  }
  return {};
}

const FILTER_LABELS: Record<DateFilter, string> = {
  all: "All dates",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom range",
};

export function TemplateHistoryPanel({ templateId }: { templateId: string }) {
  const [rows, setRows] = useState<TemplateHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const range =
      dateFilter === "custom"
        ? {
            sent_from: customFrom || undefined,
            sent_to: customTo || undefined,
          }
        : rangeForFilter(dateFilter);

    staffApi.communicationTemplates
      .history(templateId, {
        q: debouncedSearch || undefined,
        ...range,
      })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [templateId, debouncedSearch, dateFilter, customFrom, customTo]);

  const emptyLabel = useMemo(() => {
    if (debouncedSearch || dateFilter !== "all") {
      return "No recipients match your search or date filter.";
    }
    return "No patients have received this automated communication yet.";
  }, [debouncedSearch, dateFilter]);

  return (
    <div className="space-y-4 max-w-5xl">
      <p className="text-sm text-gray-500">
        Patients who received this template automation. Search by recipient and filter by send date.
      </p>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg min-w-[220px] flex-1 max-w-md">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient name"
            className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50"
          >
            Filter by date
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-border rounded-lg shadow-lg z-20 py-1">
              {(Object.keys(FILTER_LABELS) as DateFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setDateFilter(key);
                    if (key !== "custom") setFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    dateFilter === key ? "text-teal-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  {FILTER_LABELS[key]}
                </button>
              ))}
              {dateFilter === "custom" && (
                <div className="px-3 py-2 border-t border-border space-y-2">
                  <label className="block text-xs text-gray-500">
                    From
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm"
                    />
                  </label>
                  <label className="block text-xs text-gray-500">
                    To
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="w-full mt-1 px-2 py-1.5 text-xs font-semibold text-white bg-teal-500 rounded-md"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {dateFilter !== "all" && (
        <p className="text-xs text-gray-400">
          Showing: {FILTER_LABELS[dateFilter]}
          {dateFilter === "custom" && customFrom
            ? ` (${customFrom}${customTo ? ` → ${customTo}` : ""})`
            : ""}
        </p>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-medium w-8" />
                <th className="px-2 py-3 font-medium">Patient</th>
                <th className="px-2 py-3 font-medium">Communication</th>
                <th className="px-2 py-3 font-medium">Type</th>
                <th className="px-2 py-3 font-medium">Sent</th>
                <th className="px-2 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Appointment date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Loading history…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isEmail = row.channel.toLowerCase() === "email";
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 text-gray-400">
                        {isEmail ? <Mail size={14} /> : <Send size={14} />}
                      </td>
                      <td className="px-2 py-3">
                        <span className="font-medium text-gray-900">{row.patient_name}</span>
                        {row.patient_dob && (
                          <span className="text-gray-400 ml-2 text-xs">
                            {formatDob(row.patient_dob)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-gray-700">{row.communication_label}</td>
                      <td className="px-2 py-3 text-gray-700">
                        {isEmail ? "Email" : "SMS"}
                      </td>
                      <td className="px-2 py-3 text-gray-700 whitespace-nowrap">
                        {formatSent(row.sent_at)}
                      </td>
                      <td className="px-2 py-3 text-gray-700">{row.provider_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatAppt(row.appointment_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
