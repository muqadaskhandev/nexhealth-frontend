import { useState } from "react";
import { X, Search, Check, FileText } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { MANAGE_FORMS } from "./forms-data";
import type { Packet } from "../../types";

export function NewPacketModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Packet) => void }) {
  const [name, setName] = useState("New Patient Packet");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set([
    "Cancellation Policy",
    "Consent for Internet Communications",
    "Credit Card Authorization Form",
    "Dental History Form",
    "Dental Insurance Verification Form",
  ]));

  const filtered = MANAGE_FORMS.filter(f => !search || f.toLowerCase().includes(search.toLowerCase()));
  const allFilteredSelected = filtered.every(f => selected.has(f));

  function toggle(form: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(form) ? next.delete(form) : next.add(form);
      return next;
    });
  }

  function selectAll()   { setSelected(new Set(MANAGE_FORMS)); }
  function deselectAll() { setSelected(new Set()); }

  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: `pkt-${Date.now()}`, name: name.trim(), forms: [...selected] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">New Packet</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-900 mb-2">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
            />
          </div>

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
            <div className="space-y-0">
              {filtered.map(form => (
                <label key={form} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 -mx-1 px-1 rounded-lg transition-colors">
                  <div
                    onClick={() => toggle(form)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-colors ${selected.has(form) ? "bg-gray-900 border-gray-900" : "border-gray-300 bg-white"}`}
                  >
                    {selected.has(form) && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-800">{form}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleSave} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-colors">Save</button>
          <button onClick={onClose} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
