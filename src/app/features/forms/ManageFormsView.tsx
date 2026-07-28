import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Search, ChevronDown, Archive, Copy, RefreshCw, Wrench,
  Info, FileText, MoreHorizontal, Edit, Eye, Download, MapPinned, ClipboardList, Zap, Link2, Lock, Star,
} from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { NewPacketModal } from "./NewPacketModal";
import { PreviewFormModal } from "./PreviewFormModal";
import { PublicPacketAccessModal } from "./PublicPacketAccessModal";
import { CopyToLocationsModal } from "./CopyToLocationsModal";
import { ArchivedFormsView } from "./ArchivedFormsView";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { openTemplatePrintView } from "./formTemplatePrint";
import { useAuth } from "../../auth/AuthContext";
import { mapFormPacket, staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormPacket, FormTemplate } from "../../types";

export function ManageFormsView({
  onBack,
  onBuild,
  onEdit,
  onDigitize,
  onRefresh,
  templates,
  packets,
  onRefreshPackets,
}: {
  onBack: () => void;
  onBuild: () => void;
  onEdit: (template: FormTemplate) => void;
  onDigitize: () => void;
  onRefresh: () => void;
  templates: FormTemplate[];
  packets: FormPacket[];
  onRefreshPackets: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState<"forms" | "packets">("forms");
  const [search, setSearch] = useState("");
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [previewing, setPreviewing] = useState<FormTemplate | null>(null);
  const [copying, setCopying] = useState<{ preselectedFormId?: string } | null>(null);
  const [editingPacket, setEditingPacket] = useState<FormPacket | "new" | null>(null);
  const [deletingPacket, setDeletingPacket] = useState<FormPacket | null>(null);
  const [deletingPacketBusy, setDeletingPacketBusy] = useState(false);
  const [publicAccessPacket, setPublicAccessPacket] = useState<FormPacket | null>(null);
  const [publicAccessBusy, setPublicAccessBusy] = useState<string | null>(null);
  const newFormRef = useRef<HTMLDivElement>(null);

  function handlePublicAccess(pkt: FormPacket) {
    if (pkt.publicCode) {
      setPublicAccessPacket(pkt);
      return;
    }
    setPublicAccessBusy(pkt.id);
    staffApi.forms.packets
      .publicAccess(pkt.id)
      .then((updated) => {
        onRefreshPackets();
        setPublicAccessPacket(mapFormPacket(updated));
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not create a public link — please try again.");
      })
      .finally(() => setPublicAccessBusy(null));
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newFormRef.current && !newFormRef.current.contains(e.target as Node)) setNewFormOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  const noop = () => {};

  async function handleDuplicate(t: FormTemplate) {
    if (!isAdmin) return;
    try {
      await staffApi.forms.duplicateTemplate(t.id);
      toastSuccess("Your duplicated form is ready!");
      onRefresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not duplicate this form — please try again.");
    }
  }

  async function handleDownload(t: FormTemplate) {
    if (t.status === "digitizing") {
      toastError("This form is still being digitized — download isn't available yet.");
      return;
    }
    openTemplatePrintView(t);
  }

  async function handleArchive(t: FormTemplate) {
    if (!isAdmin) return;
    try {
      await staffApi.forms.archiveTemplate(t.id);
      toastSuccess(`"${t.name}" archived`);
      onRefresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not archive this form — please try again.");
    }
  }

  function hasMedicalAlerts(t: FormTemplate): boolean {
    return t.fields.some((f) => f.type === "medical_alerts_dropdown" || f.type === "medical_alerts_radio");
  }

  async function handleSetDefault(t: FormTemplate) {
    if (!isAdmin) return;
    try {
      await staffApi.forms.setDefaultTemplate(t.id);
      toastSuccess(`"${t.name}" is now the default Medical History form`);
      onRefresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not set this form as default — please try again.");
    }
  }

  function formNamesFor(pkt: FormPacket): string[] {
    return pkt.formTemplateIds
      .map(id => templates.find(t => t.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }

  async function handleDuplicatePacket(pkt: FormPacket) {
    if (!isAdmin) return;
    try {
      await staffApi.forms.packets.duplicate(pkt.id);
      toastSuccess("Your duplicated packet is ready!");
      onRefreshPackets();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not duplicate this packet — please try again.");
    }
  }

  async function handleDeletePacket() {
    if (!deletingPacket) return;
    setDeletingPacketBusy(true);
    try {
      await staffApi.forms.packets.delete(deletingPacket.id);
      toastSuccess(`"${deletingPacket.name}" deleted`);
      setDeletingPacket(null);
      onRefreshPackets();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not delete this packet — please try again.");
    } finally {
      setDeletingPacketBusy(false);
    }
  }

  if (showArchived) {
    return <ArchivedFormsView onBack={() => setShowArchived(false)} onChanged={onRefresh} />;
  }

  return (
    <>
    <div className="w-full min-w-0 px-4 sm:px-6 py-5">
      {/* Back + heading */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors mb-2">
        <ArrowLeft size={14} /> Forms
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Manage Forms</h1>

      {!isAdmin && (
        <div className="mb-4 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          You need the Admin permission level for the Forms feature to create, edit, or digitize forms.
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-xl border border-border overflow-visible">
        {/* Tab bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
          <div className="flex items-center gap-1">
            {(["forms", "packets"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <IconButton
              label="View archived forms"
              onClick={() => setShowArchived(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              <Archive size={14} /> Archived forms
            </IconButton>
            <IconButton
              label={isAdmin ? "Copy forms to other locations" : "You need the Admin permission level for the Forms feature"}
              onClick={() => isAdmin && templates.length > 0 && setCopying({})}
              disabled={!isAdmin || templates.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Copy size={14} /> Copy to locations
            </IconButton>
          </div>
        </div>

        {/* Search + action button — changes per tab */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 border border-gray-200 rounded-lg">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={activeTab === "packets" ? "Search packets" : "Search forms"} className="flex-1 min-w-0 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent" />
          </div>

          {activeTab === "forms" ? (
            <div ref={newFormRef} className="relative">
              <button
                onClick={() => isAdmin && setNewFormOpen(v => !v)}
                disabled={!isAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                New form <ChevronDown size={14} />
              </button>
              {newFormOpen && (
                <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                  <button onClick={() => { setNewFormOpen(false); onDigitize(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <RefreshCw size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">Digitize <span className="text-gray-400">↗</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">Attach files and NexHealth will convert your forms.</p>
                      </div>
                    </div>
                  </button>
                  <div className="h-px bg-gray-100 mx-4" />
                  <button onClick={() => { setNewFormOpen(false); onBuild(); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Wrench size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Build</p>
                        <p className="text-xs text-gray-500 mt-0.5">Create a new form by using the form builder.</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <IconButton
              label={isAdmin ? "Create a new packet" : "You need the Admin permission level for the Forms feature"}
              onClick={() => isAdmin && setEditingPacket("new")}
              disabled={!isAdmin}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              New packet
            </IconButton>
          )}
        </div>

        {/* Forms tab — table */}
        {activeTab === "forms" && (
          <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1">Name <ChevronDown size={11} className="opacity-50" /></span>
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1"><Info size={11} className="text-gray-400" />Send automatically</span>
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-sm text-gray-400">
                    No forms yet. Click "New form" to build or digitize one.
                  </td>
                </tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-800 font-medium truncate">{t.name}</span>
                      {t.source === "digitize" && t.status === "digitizing" && (
                        <IconButton
                          label="Our team converts this outside of this demo environment"
                          onClick={noop}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 flex-shrink-0"
                        >
                          <RefreshCw size={10} className="animate-spin" /> Digitizing…
                        </IconButton>
                      )}
                      {hasMedicalAlerts(t) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 flex-shrink-0">
                          Medical History
                        </span>
                      )}
                      {hasMedicalAlerts(t) && t.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 flex-shrink-0">
                          Default
                        </span>
                      )}
                      {t.isLocked && (
                        <IconButton
                          label="Has real patient submissions — duplicate to make changes"
                          onClick={noop}
                          className="text-gray-400 flex-shrink-0"
                        >
                          <Lock size={12} />
                        </IconButton>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {t.sendAutomatically ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        <Zap size={10} /> Yes
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
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
                        <DropdownMenuItem
                          disabled={!isAdmin || t.source !== "build"}
                          title={t.source !== "build" ? "Digitized forms are edited by our form-building team" : undefined}
                          onSelect={() => { if (isAdmin && t.source === "build") onEdit(t); }}
                        >
                          <Edit size={14} />Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPreviewing(t)}>
                          <Eye size={14} />Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!isAdmin}
                          onSelect={() => { if (isAdmin) handleDuplicate(t); }}
                        >
                          <Copy size={14} />Duplicate
                        </DropdownMenuItem>
                        {hasMedicalAlerts(t) && !t.isDefault && (
                          <DropdownMenuItem
                            disabled={!isAdmin}
                            onSelect={() => { if (isAdmin) handleSetDefault(t); }}
                          >
                            <Star size={14} />Mark as default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={t.status === "digitizing"}
                          onSelect={() => handleDownload(t)}
                        >
                          <Download size={14} />Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!isAdmin}
                          onSelect={() => { if (isAdmin) setCopying({ preselectedFormId: t.id }); }}
                        >
                          <MapPinned size={14} />Copy to locations
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!isAdmin}
                          className="text-red-600 focus:text-red-600"
                          onSelect={() => { if (isAdmin) handleArchive(t); }}
                        >
                          <Archive size={14} />Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Packets tab */}
        {activeTab === "packets" && (
          <div>
            {packets.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">No packets yet. Click "New packet" to create one.</div>
            ) : (
              <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">
                      <span className="flex items-center gap-1">Name <ChevronDown size={11} className="opacity-50" /></span>
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700">Forms included</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {packets
                    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                    .map(pkt => {
                      const names = formNamesFor(pkt);
                      return (
                      <tr key={pkt.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <ClipboardList size={15} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-800 font-medium">{pkt.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-gray-500">{names.length} form{names.length !== 1 ? "s" : ""}</span>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{names.slice(0, 3).join(", ")}{names.length > 3 ? "…" : ""}</p>
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
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                onSelect={() => { if (isAdmin) setEditingPacket(pkt); }}
                              >
                                <Edit size={14} />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                onSelect={() => { if (isAdmin) handleDuplicatePacket(pkt); }}
                              >
                                <Copy size={14} />Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!isAdmin || publicAccessBusy === pkt.id}
                                onSelect={() => { if (isAdmin) handlePublicAccess(pkt); }}
                              >
                                <Link2 size={14} />{publicAccessBusy === pkt.id ? "Loading…" : "Public packet access"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!isAdmin}
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => { if (isAdmin) setDeletingPacket(pkt); }}
                              >
                                <Archive size={14} />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* New / Edit Packet modal */}
    {editingPacket && (
      <NewPacketModal
        initial={editingPacket === "new" ? undefined : editingPacket}
        templates={templates}
        onClose={() => setEditingPacket(null)}
        onSaved={() => {
          setEditingPacket(null);
          onRefreshPackets();
        }}
      />
    )}

    {deletingPacket && (
      <ConfirmModal
        title="Delete this packet?"
        message={`"${deletingPacket.name}" will be removed. The forms inside it won't be affected.`}
        confirmLabel="Yes, delete packet"
        danger
        submitting={deletingPacketBusy}
        onConfirm={handleDeletePacket}
        onCancel={() => setDeletingPacket(null)}
      />
    )}

    {previewing && <PreviewFormModal template={previewing} onClose={() => setPreviewing(null)} />}

    {publicAccessPacket && (
      <PublicPacketAccessModal packet={publicAccessPacket} onClose={() => setPublicAccessPacket(null)} />
    )}

    {copying && (
      <CopyToLocationsModal
        templates={templates}
        packets={packets}
        preselectedFormId={copying.preselectedFormId}
        onClose={() => setCopying(null)}
        onCopied={() => {
          onRefresh();
          onRefreshPackets();
        }}
      />
    )}
    </>
  );
}
