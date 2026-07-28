import { useEffect, useState } from "react";
import { Search, ChevronDown, FileText, MoreHorizontal, RotateCcw, WifiOff } from "lucide-react";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { RequestFormsModal } from "./RequestFormsModal";
import { ReactivateFormModal } from "./ReactivateFormModal";
import { AgentSessionModal } from "./AgentSessionModal";
import { AssignPacketSubmissionModal } from "./AssignPacketSubmissionModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
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

const COMPLETED_STATUS_LABEL: Record<string, string> = {
  sent: "Sent",
  viewed: "Viewed",
  in_progress: "In Progress",
  complete: "Complete",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openSubmissionPrintView(patientName: string, rows: { form_name: string; answers: Record<string, unknown>; submitted_at: string }[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const sections = rows
    .map(
      (r) => `
        <h2>${escapeHtml(r.form_name)}</h2>
        <p class="meta">Submitted ${escapeHtml(new Date(r.submitted_at).toLocaleString())}</p>
        <table>
          ${Object.entries(r.answers)
            .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(Array.isArray(v) ? v.join(", ") : String(v))}</td></tr>`)
            .join("")}
        </table>
      `
    )
    .join("<hr/>");
  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(patientName)} — Forms</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #111; }
          h1 { font-size: 20px; } h2 { font-size: 15px; margin-top: 24px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 8px; }
          table { border-collapse: collapse; width: 100%; }
          td { border: 1px solid #ddd; padding: 6px 10px; font-size: 13px; vertical-align: top; }
          td:first-child { font-weight: 600; width: 35%; background: #fafafa; }
          hr { margin: 24px 0; border: none; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(patientName)}</h1>
        ${sections || "<p>No submitted answers found.</p>"}
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
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
  const [activeTab, setActiveTab] = useState<"active" | "expired" | "deleted" | "synced" | "pending" | "all">("active");
  const [search, setSearch] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestBatches, setRequestBatches] = useState<FormRequestBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [reactivating, setReactivating] = useState<FormRequestBatch | null>(null);
  const [archiving, setArchiving] = useState<FormRequestBatch | null>(null);
  const [archivingBusy, setArchivingBusy] = useState(false);
  const [deleting, setDeleting] = useState<FormRequestBatch | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<PublicPacketSubmission[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [assigning, setAssigning] = useState<PublicPacketSubmission | null>(null);
  const [agentSessionView, setAgentSessionView] = useState<{ sessionId: string; patientName: string } | null>(null);
  const [syncBusyKey, setSyncBusyKey] = useState<string | null>(null);

  function handleSyncNow(key: string, batch: FormRequestBatch) {
    setSyncBusyKey(key);
    staffApi.forms.requests
      .sync(batch.requestIds)
      .then(() => {
        toastSuccess("Sync finished — refresh the list. Failed if patient isn’t linked to EHR.");
        refreshBatches();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not sync — please try again.");
      })
      .finally(() => setSyncBusyKey(null));
  }

  function handleMarkSynced(key: string, batch: FormRequestBatch) {
    setSyncBusyKey(key);
    staffApi.forms.requests
      .markSynced(batch.requestIds)
      .then(() => {
        toastSuccess("Marked as synced");
        refreshBatches();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not update — please try again.");
      })
      .finally(() => setSyncBusyKey(null));
  }

  function handleViewAgentIntake(batch: FormRequestBatch) {
    staffApi.forms.requests
      .submissions(batch.requestIds)
      .then((rows) => {
        const agentRow = rows.find((r) => r.agent_session_id);
        if (!agentRow?.agent_session_id) {
          toastError("No chat intake session found for this request.");
          return;
        }
        setAgentSessionView({ sessionId: agentRow.agent_session_id, patientName: batch.patientName });
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not load chat intake.");
      });
  }

  function handleDownloadPdf(batch: FormRequestBatch) {
    staffApi.forms.requests
      .submissions(batch.requestIds)
      .then((rows) => openSubmissionPrintView(batch.patientName, rows))
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not load the submitted forms — please try again.");
      });
  }

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

  function handleDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    staffApi.forms.requests
      .delete(deleting.requestIds)
      .then(() => {
        toastSuccess("Form request permanently deleted");
        setDeleting(null);
        refreshBatches();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not delete this form request — please try again.");
      })
      .finally(() => setDeletingBusy(false));
  }

  const usesBatches =
    activeTab === "active" ||
    activeTab === "expired" ||
    activeTab === "deleted" ||
    activeTab === "synced" ||
    activeTab === "all";

  function refreshBatches() {
    if (!usesBatches) return;
    setLoadingBatches(true);
    staffApi.forms.requests
      .list(activeTab)
      .then(rows => setRequestBatches(rows.map(mapFormRequestBatch)))
      .finally(() => setLoadingBatches(false));
  }

  useEffect(refreshBatches, [activeTab]);

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
          <button onClick={onManage} className="px-3.5 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700">
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
          {(["active", "expired", "deleted", "synced", "pending", "all"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize flex-shrink-0 ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab === "deleted" ? "Deleted" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
      <div className="bg-white rounded-xl border border-border">
        <div>
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
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  {activeTab === "all"
                    ? "No form requests yet."
                    : activeTab === "deleted"
                      ? "No deleted form requests."
                      : `No ${activeTab} form requests.`}
                </td></tr>
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
                    {b.status === "expired" ? (
                      <StatusBadge status="expired" />
                    ) : b.status === "synced" ? (
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-xs text-gray-500 font-medium">Complete</span>
                        <span className="text-xs font-medium text-emerald-600">Synced</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-xs text-gray-500 font-medium">{COMPLETED_STATUS_LABEL[b.completedStatus]}</span>
                        {b.completedStatus === "complete" && b.syncStatus && (
                          <button
                            onClick={() => handleSyncNow(key, b)}
                            disabled={syncBusyKey === key}
                            className="disabled:opacity-60"
                          >
                            <SyncBadge status={syncBusyKey === key ? "syncing" : b.syncStatus} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="More"
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-gray-400 hover:bg-gray-100 data-[state=open]:bg-teal-500 data-[state=open]:text-white"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom" className="w-52 min-w-52">
                        {(activeTab === "expired" || (activeTab === "all" && b.status === "expired")) && (
                          <DropdownMenuItem onSelect={() => setReactivating(b)}>
                            Move to active
                          </DropdownMenuItem>
                        )}
                        {activeTab !== "deleted" && b.completedStatus === "complete" && (
                          <>
                            <DropdownMenuItem onSelect={() => handleViewAgentIntake(b)}>
                              View chat intake
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleMarkSynced(key, b)}>
                              Mark as synced
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDownloadPdf(b)}>
                              Download PDF
                            </DropdownMenuItem>
                          </>
                        )}
                        {activeTab !== "deleted" && (
                          <DropdownMenuItem onSelect={() => setArchiving(b)}>
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onSelect={() => setDeleting(b)}
                        >
                          Delete permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                );
              })
            ) : null}
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
        message={`The form request for ${archiving.patientName} will be moved to Deleted — use this for a soft delete if the patient filled out paper forms instead.`}
        confirmLabel="Yes, archive"
        danger
        submitting={archivingBusy}
        onConfirm={handleArchive}
        onCancel={() => setArchiving(null)}
      />
    )}
    {deleting && (
      <ConfirmModal
        title="Delete permanently?"
        message={`This permanently deletes the form request for ${deleting.patientName} and any related answers. This cannot be undone.`}
        confirmLabel="Yes, delete forever"
        danger
        submitting={deletingBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
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
    {agentSessionView && (
      <AgentSessionModal
        sessionId={agentSessionView.sessionId}
        patientName={agentSessionView.patientName}
        onClose={() => setAgentSessionView(null)}
      />
    )}
    </>
  );
}
