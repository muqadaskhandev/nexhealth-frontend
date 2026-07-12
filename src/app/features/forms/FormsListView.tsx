import { useEffect, useState } from "react";
import { Search, ChevronDown, Info, FileText, MoreHorizontal, RotateCcw, WifiOff } from "lucide-react";
import { RequestFormsModal } from "./RequestFormsModal";
import type { FormSyncStatus, FormSubmission } from "../../types";

function SyncBadge({ status, label }: { status: FormSyncStatus; label?: string }) {
  if (status === "syncing")      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"><RotateCcw size={11} className="animate-spin" />Syncing</span>;
  if (status === "sync-now")     return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500 text-white">Sync now</span>;
  if (status === "assign-sync")  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500 text-white">Assign &amp; sync</span>;
  if (status === "sync-failed")  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-red-500 border border-red-300"><WifiOff size={11} />Sync failed</span>;
  if (status === "date")         return <span className="text-xs font-medium text-emerald-600">{label}</span>;
  return null;
}

export function FormsListView({
  onManage,
  submissions = [],
  patients = [],
}: {
  onManage: () => void;
  submissions?: FormSubmission[];
  patients?: import("../../types").Patient[];
}) {
  const [activeTab, setActiveTab] = useState<"active" | "synced" | "expired" | "all">("active");
  const [search, setSearch] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  const filtered = submissions.filter(s =>
    !search || s.patient.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
        <div className="flex items-center gap-2">
          <button onClick={onManage} className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Manage forms
          </button>
          <button className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Settings
          </button>
          <button className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Templates
          </button>
          <button onClick={() => setShowRequestModal(true)} className="px-4 py-1.5 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors">
            Request forms
          </button>
        </div>
      </div>

      {/* Tab bar + filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
          {(["active", "synced", "expired", "all"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white text-sm">
            <Search size={13} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a patient" className="outline-none text-gray-700 placeholder:text-gray-400 bg-transparent w-32" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white">
            Filter by <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="w-8 px-4 py-2.5" />
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Patients <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Expiration date <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">Forms</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Status <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="w-4 h-4 rounded accent-teal-500" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {row.initials}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{row.patient}</p>
                      <p className="text-xs text-gray-400">{row.submitted}</p>
                      <p className="text-xs text-gray-400">{row.device}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{row.expiration || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <FileText size={13} className="text-blue-400" />
                    {row.formName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">{row.completedStatus}</span>
                    <SyncBadge status={row.syncStatus} label={row.syncLabel} />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    {showRequestModal && (
      <RequestFormsModal patients={patients} onClose={() => setShowRequestModal(false)} />
    )}
    </>
  );
}
