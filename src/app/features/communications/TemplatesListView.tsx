import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
      className={`inline-block w-2.5 h-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`}
      title={active ? "Active" : "Inactive"}
    />
  );
}

export function TemplatesListView({
  onOpen,
}: {
  onOpen: (template: CommunicationTemplate) => void;
}) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    staffApi.communicationTemplates
      .list()
      .then((rows) => setTemplates(rows.map(mapCommunicationTemplate)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Templates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automated and manually triggered patient communication sequences.
        </p>
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
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10" />
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
                    className="border-b border-border last:border-0 hover:bg-teal-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <StatusDot active={t.isActive} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900">{t.name}</div>
                      {t.multiLocation && (
                        <div className="text-xs text-amber-700 mt-0.5">Multiple locations</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.locationName || "—"}</td>
                    <td className="px-4 py-3.5 text-gray-600">{t.totalSent}</td>
                    <td className="px-4 py-3.5 text-gray-600">{t.recipients}</td>
                    <td className="px-4 py-3.5 text-gray-500">{formatDate(t.updatedAt)}</td>
                    <td className="px-4 py-3.5 text-gray-500">{formatDate(t.createdAt)}</td>
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
