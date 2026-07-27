import { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { staffApi, mapFormTemplate } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormTemplate } from "../../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function ArchivedFormsView({ onBack, onChanged }: { onBack: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [archived, setArchived] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    staffApi.forms
      .templates(true)
      .then((rows) => setArchived(rows.map(mapFormTemplate)))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function handleUnarchive(t: FormTemplate) {
    if (unarchivingId || !isAdmin) return;
    setUnarchivingId(t.id);
    try {
      await staffApi.forms.unarchiveTemplate(t.id);
      toastSuccess(`"${t.name}" unarchived`);
      setArchived((prev) => prev.filter((f) => f.id !== t.id));
      onChanged();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not unarchive this form — please try again.");
    } finally {
      setUnarchivingId(null);
    }
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors mb-2">
        <ArrowLeft size={14} /> Forms
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Archived forms</h1>

      {!isAdmin && (
        <div className="mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          You need the Admin permission level for the Forms feature to unarchive forms.
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : archived.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No archived forms.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">Form name</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">Created on</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">Archived on</th>
                  <th className="w-32" />
                </tr>
              </thead>
              <tbody>
                {archived.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-800 font-medium truncate">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <p>{formatDate(t.createdAt)}</p>
                      <p className="text-xs text-gray-400">{timeAgo(t.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {t.archivedAt && (
                        <>
                          <p>{formatDate(t.archivedAt)}</p>
                          <p className="text-xs text-gray-400">{timeAgo(t.archivedAt)}</p>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <IconButton
                        label={isAdmin ? "Unarchive this form" : "You need the Admin permission level for the Forms feature"}
                        onClick={() => handleUnarchive(t)}
                        disabled={!isAdmin || unarchivingId === t.id}
                        className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {unarchivingId === t.id ? "Unarchiving…" : "Unarchive"}
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
