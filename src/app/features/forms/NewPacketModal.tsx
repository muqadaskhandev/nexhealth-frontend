import { useState } from "react";
import { X, Search, Check, FileText, ChevronUp, ChevronDown } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { FormPacket, FormTemplate } from "../../types";

export function NewPacketModal({
  initial,
  templates,
  onClose,
  onSaved,
}: {
  initial?: FormPacket;
  templates: FormTemplate[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "New Patient Packet");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.formTemplateIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sortedTemplates = [...templates].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sortedTemplates.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t.id));

  const selectedTemplates = selectedIds
    .map(id => templates.find(t => t.id === id))
    .filter((t): t is FormTemplate => Boolean(t));

  function toggle(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function selectAll()   { setSelectedIds(templates.map(t => t.id)); }
  function deselectAll() { setSelectedIds([]); }

  function move(id: string, dir: -1 | 1) {
    setSelectedIds(prev => {
      const idx = prev.indexOf(id);
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (submitting) return;
    setError(null);
    if (!name.trim()) {
      setError("Give this packet a name.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least one form to add to this packet.");
      return;
    }
    setSubmitting(true);
    try {
      const body = { name: name.trim(), form_template_ids: selectedIds };
      if (initial) await staffApi.forms.packets.update(initial.id, body);
      else await staffApi.forms.packets.create(body);
      toastSuccess(initial ? "Packet updated" : "Packet created");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      const msg = apiErr?.detail || "Could not save this packet — please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{initial ? "Edit Packet" : "New Packet"}</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-900 mb-2">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
            />
          </div>

          {/* Selected order */}
          {selectedTemplates.length > 0 && (
            <div className="mb-5">
              <label className="text-sm font-bold text-gray-900 mb-2 block">Packet order</label>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {selectedTemplates.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{t.name}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <IconButton label="Move up" onClick={() => move(t.id, -1)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp size={13} /></IconButton>
                      <IconButton label="Move down" onClick={() => move(t.id, 1)} disabled={i === selectedTemplates.length - 1} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown size={13} /></IconButton>
                      <IconButton label="Remove from packet" onClick={() => toggle(t.id)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500"><X size={13} /></IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add forms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-900">Add forms to packet</label>
              <div className="flex items-center gap-3">
                <button onClick={selectAll}   className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">Select All</button>
                <button onClick={deselectAll} className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">Deselect All</button>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl mb-3">
              <Search size={14} className="text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search"
                className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
              />
            </div>

            {/* Form list */}
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No forms found.</p>
            ) : (
              <div className="space-y-0">
                {filtered.map(t => (
                  <label key={t.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 -mx-1 px-1 rounded-lg transition-colors">
                    <div
                      onClick={() => toggle(t.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-colors ${selectedIds.includes(t.id) ? "bg-gray-900 border-gray-900" : "border-gray-300 bg-white"}`}
                    >
                      {selectedIds.includes(t.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800 truncate">{t.name}</span>
                  </label>
                ))}
              </div>
            )}
            {allFilteredSelected && filtered.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">All matching forms are selected.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleSave} disabled={submitting} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-xl transition-colors">
            {submitting ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
