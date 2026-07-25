import { useEffect, useState } from "react";
import { Search, ChevronDown, Info, FileText, MoreHorizontal, RotateCcw, WifiOff } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { RequestFormsModal } from "./RequestFormsModal";
import { ReactivateFormModal } from "./ReactivateFormModal";
import { AssignPacketSubmissionModal } from "./AssignPacketSubmissionModal";
import { staffApi, mapFormRequestBatch, mapPublicPacketSubmission } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormSyncStatus, FormSubmission, FormTemplate, FormPacket, FormRequestBatch, PublicPacketSubmission } from "../../types";

function SyncBadge({ status, label }: { status: FormSyncStatus; label?: string }) {
  if (status === "syncing")      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"><RotateCcw size={11} className="animate-spin" />Syncing</span>;
  if (status === "sync-now")     return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500 text-white">Sync now</span>;
  if (status === "assign-sync")  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500 text-white">Assign &amp; sync</span>;
  if (status === "sync-failed")  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-red-500 border border-red-300"><WifiOff size={11} />Sync failed</span>;
  if (status === "date")         return <span className="text-xs font-medium text-emerald-600">{label}</span>;
  return null;
}

function StatusBadge({ status }: { status: "active" | "expired" }) {
  if (status === "expired") {
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Expired</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function FormsListView({
  onManage,
  onSettings,
  submissions = [],
  patients = [],
  templates = [],
  packets = [],
}: {
  onManage: () => void;
  onSettings: () => void;
  submissions?: FormSubmission[];
  patients?: import("../../types").Patient[];
  templates?: FormTemplate[];
  packets?: FormPacket[];
}) {
  const [activeTab, setActiveTab] = useState<"active" | "synced" | "expired" | "pending" | "all">("active");
  const [search, setSearch] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestBatches, setRequestBatches] = useState<FormRequestBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [ellipsisOpen, setEllipsisOpen] = useState<string | null>(null);
  const [reactivating, setReactivating] = useState<FormRequestBatch | null>(null);
  const [archiving, setArchiving] = useState<FormRequestBatch | null>(null);
  const [archivingBusy, setArchivingBusy] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<PublicPacketSubmission[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [assigning, setAssigning] = useState<PublicPacketSubmission | null>(null);

  function refreshPending() {
    if (activeTab !== "pending") return;
    setLoadingPending(true);
    staffApi.forms.publicSubmissions
      .list()
      .then((rows) => setPendingSubmissions(rows.map(mapPublicPacketSubmission)))
      .finally(() => setLoadingPending(false));
  }

  useEffect(refreshPending, [activeTab]);

  function handleArchive() {
    if (!archiving) return;
    setArchivingBusy(true);
    staffApi.forms.requests
      .archive(archiving.requestIds)
      .then(() => {
        toastSuccess("Form request archived");
        setArchiving(null);
        refreshBatches();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not archive this form request — please try again.");
      })
      .finally(() => setArchivingBusy(false));
  }

  const usesBatches = activeTab === "active" || activeTab === "expired";

  function refreshBatches() {
    if (!usesBatches) return;
    setLoadingBatches(true);
    staffApi.forms.requests
      .list(activeTab)
      .then(rows => setRequestBatches(rows.map(mapFormRequestBatch)))
      .finally(() => setLoadingBatches(false));
  }

  useEffect(refreshBatches, [activeTab]);

  const filteredSubmissions = submissions.filter(s =>
    !search || s.patient.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBatches = requestBatches.filter(b =>
    !search || b.patientName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPending = pendingSubmissions.filter(s =>
    !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onManage} className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Manage forms
          </button>
          <button onClick={onSettings} className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Settings
          </button>
          <button className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
            Templates
          </button>
          <button onClick={() => setShowRequestModal(true)} className="px-4 py-1.5 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors whitespace-nowrap">
            Request forms
          </button>
        </div>
      </div>

      {/* Tab bar + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1 overflow-x-auto">
          {(["active", "synced", "expired", "pending", "all"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize flex-shrink-0 ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white text-sm flex-1 sm:flex-initial">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a patient" className="outline-none text-gray-700 placeholder:text-gray-400 bg-transparent w-full sm:w-32" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white whitespace-nowrap">
            Filter by <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="w-8 px-4 py-2.5" />
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Patients <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">{usesBatches ? "Due date" : activeTab === "pending" ? "Contact" : "Expiration date"} <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">{activeTab === "pending" ? "Packet" : "Forms"}</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1">Status <ChevronDown size={11} className="opacity-50" /></span>
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {activeTab === "pending" ? (
              loadingPending ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : filteredPending.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No public packet submissions waiting to be synced.</td></tr>
              ) : filteredPending.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="w-4 h-4 rounded accent-teal-500" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {(s.firstName.slice(0, 1) || "").toUpperCase()}{(s.lastName.slice(0, 1) || "").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-gray-400">{fmtDateTime(s.createdAt)}</p>
                        <p className="text-xs text-gray-400">Public packet link</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.phone || s.email || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-700 font-medium">{s.packetName}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{s.formNames.join(", ")}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SyncBadge status="assign-sync" />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setAssigning(s)}
                      className="px-3 py-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                      Assign &amp; sync
                    </button>
                  </td>
                </tr>
              ))
            ) : usesBatches ? (
              loadingBatches ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : filteredBatches.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No {activeTab} form requests.</td></tr>
              ) : filteredBatches.map(b => {
                const key = `${b.patientId}-${b.sentAt}`;
                return (
                <tr key={key} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="w-4 h-4 rounded accent-teal-500" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {b.patientInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{b.patientName}</p>
                        <p className="text-xs text-gray-400">{fmtDateTime(b.sentAt)}</p>
                        <p className="text-xs text-gray-400">Sent manually</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDateTime(b.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {b.forms.map(f => (
                        <div key={f.id} className="flex items-center gap-1.5 text-xs text-blue-600">
                          <FileText size={13} className="text-blue-400 flex-shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status === "expired" ? "expired" : "active"} />
                  </td>
                  <td className="px-3 py-3 relative">
                    <IconButton
                      label="More"
                      onClick={() => setEllipsisOpen(ellipsisOpen === key ? null : key)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${ellipsisOpen === key ? "bg-teal-500 text-white" : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"}`}
                    >
                      <MoreHorizontal size={15} />
                    </IconButton>
                    {ellipsisOpen === key && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                        {b.status === "expired" && (
                          <button
                            onClick={() => { setEllipsisOpen(null); setReactivating(b); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Move to active
                          </button>
                        )}
                        <button
                          onClick={() => { setEllipsisOpen(null); setArchiving(b); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })
            ) : (
              filteredSubmissions.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No {activeTab === "all" ? "" : activeTab} forms yet.</td></tr>
              ) : filteredSubmissions.map(row => (
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
                  <button title="More" className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal size={15} />
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
    {showRequestModal && (
      <RequestFormsModal
        patients={patients}
        templates={templates}
        packets={packets}
        onClose={() => setShowRequestModal(false)}
        onSent={refreshBatches}
      />
    )}
    {reactivating && (
      <ReactivateFormModal
        batch={reactivating}
        onClose={() => setReactivating(null)}
        onReactivated={() => {
          setReactivating(null);
          refreshBatches();
        }}
      />
    )}
    {archiving && (
      <ConfirmModal
        title="Archive this form request?"
        message={`The form request for ${archiving.patientName} will be removed from this list — use this if the patient filled out paper forms instead.`}
        confirmLabel="Yes, archive"
        danger
        submitting={archivingBusy}
        onConfirm={handleArchive}
        onCancel={() => setArchiving(null)}
      />
    )}
    {assigning && (
      <AssignPacketSubmissionModal
        submission={assigning}
        patients={patients}
        onClose={() => setAssigning(null)}
        onAssigned={() => {
          setAssigning(null);
          refreshPending();
        }}
      />
    )}
    </>
  );
}
