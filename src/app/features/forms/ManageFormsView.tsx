import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Search, ChevronDown, Archive, Copy, RefreshCw, Wrench,
  Info, FileText, MoreHorizontal, Edit, Eye, Download, MapPinned, ClipboardList,
} from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { NewPacketModal } from "./NewPacketModal";
import { PreviewFormModal } from "./PreviewFormModal";
import { useAuth } from "../../auth/AuthContext";
import type { FormTemplate, Packet } from "../../types";

export function ManageFormsView({
  onBack,
  onBuild,
  onEdit,
  onDigitize,
  templates,
}: {
  onBack: () => void;
  onBuild: () => void;
  onEdit: (template: FormTemplate) => void;
  onDigitize: () => void;
  templates: FormTemplate[];
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<"forms" | "packets">("forms");
  const [search, setSearch] = useState("");
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [ellipsisOpen, setEllipsisOpen] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<FormTemplate | null>(null);
  const [packets, setPackets] = useState<Packet[]>([
    { id: "pkt1", name: "New Patient Paperwork", forms: ["Cancellation Policy", "Consent for Internet Communications", "Medical History Form", "Patient Information Form"] },
    { id: "pkt2", name: "Insurance Verification", forms: ["Dental Insurance Verification Form", "Credit Card Authorization Form"] },
  ]);
  const [showNewPacket, setShowNewPacket] = useState(false);
  const newFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newFormRef.current && !newFormRef.current.contains(e.target as Node)) setNewFormOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  const noop = () => {};

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
              label="Not available in this demo yet"
              onClick={noop}
              disabled
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 cursor-not-allowed"
            >
              <Archive size={14} /> Archived forms
            </IconButton>
            <IconButton
              label="See the copying & duplicating forms article"
              onClick={noop}
              disabled
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 cursor-not-allowed"
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
            <button onClick={() => setShowNewPacket(true)} className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap">
              New packet
            </button>
          )}
        </div>

        {/* Forms tab — table */}
        {activeTab === "forms" && (
          <div className="overflow-x-auto">
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
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-3 py-3 relative">
                    <IconButton
                      label="More"
                      onClick={() => setEllipsisOpen(ellipsisOpen === t.id ? null : t.id)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${ellipsisOpen === t.id ? "bg-teal-500 text-white" : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"}`}
                    >
                      <MoreHorizontal size={15} />
                    </IconButton>
                    {ellipsisOpen === t.id && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { setEllipsisOpen(null); setPreviewing(t); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={14} />Preview
                        </button>
                        <button
                          onClick={() => { if (isAdmin && t.source === "build") { setEllipsisOpen(null); onEdit(t); } }}
                          disabled={!isAdmin || t.source !== "build"}
                          title={t.source !== "build" ? "Digitized forms don't have editable fields yet" : undefined}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                          <Edit size={14} />Edit details
                        </button>
                        <IconButton label="See the copying & duplicating forms article" onClick={noop} disabled
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 cursor-not-allowed">
                          <Copy size={14} />Duplicate
                        </IconButton>
                        <IconButton label="Not available in this demo yet" onClick={noop} disabled
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 cursor-not-allowed">
                          <Download size={14} />Download
                        </IconButton>
                        <IconButton label="See the copying & duplicating forms article" onClick={noop} disabled
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 cursor-not-allowed">
                          <MapPinned size={14} />Copy to locations
                        </IconButton>
                        <IconButton label="Not available in this demo yet" onClick={noop} disabled
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 cursor-not-allowed">
                          <Archive size={14} />Archive
                        </IconButton>
                      </div>
                    )}
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
              <div className="overflow-x-auto">
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
                    .map(pkt => (
                      <tr key={pkt.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <ClipboardList size={15} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-800 font-medium">{pkt.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-gray-500">{pkt.forms.length} form{pkt.forms.length !== 1 ? "s" : ""}</span>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{pkt.forms.slice(0, 3).join(", ")}{pkt.forms.length > 3 ? "…" : ""}</p>
                        </td>
                        <td className="px-3 py-3 relative">
                          <IconButton
                            label="More"
                            onClick={() => setEllipsisOpen(ellipsisOpen === pkt.id ? null : pkt.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${ellipsisOpen === pkt.id ? "bg-teal-500 text-white" : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"}`}
                          >
                            <MoreHorizontal size={15} />
                          </IconButton>
                          {ellipsisOpen === pkt.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setEllipsisOpen(null)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Edit size={14} />Edit</button>
                              <button onClick={() => setEllipsisOpen(null)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Copy size={14} />Duplicate</button>
                              <button onClick={() => { setPackets(prev => prev.filter(p => p.id !== pkt.id)); setEllipsisOpen(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-gray-50"><Archive size={14} />Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* New Packet modal */}
    {showNewPacket && (
      <NewPacketModal
        onClose={() => setShowNewPacket(false)}
        onSave={pkt => setPackets(prev => [...prev, pkt])}
      />
    )}

    {previewing && <PreviewFormModal template={previewing} onClose={() => setPreviewing(null)} />}
    </>
  );
}
