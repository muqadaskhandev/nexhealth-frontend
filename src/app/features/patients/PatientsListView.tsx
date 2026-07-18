import { useState } from "react";
import { Search } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { SyncTooltip } from "../../components/shared/SyncTooltip";
import type { Patient } from "../../types";

export function PatientsListView({ patients, onOpenPanel, onCreateOpen, onViewArchived, onViewDuplicates }: {
  patients: Patient[]; onOpenPanel: (p: Patient) => void;
  onCreateOpen: () => void; onViewArchived: () => void; onViewDuplicates: () => void;
}) {
  const active = patients.filter(p => !p.archived);
  const [search, setSearch] = useState("");
  const filtered = active.filter(p => !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <div className="flex items-center gap-3">
          <button onClick={onViewDuplicates} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">Review duplicate patients</button>
          <button onClick={onViewArchived} className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">View archived patients</button>
          <button onClick={onCreateOpen} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-800">Create patient</button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-lg max-w-xs">
        <Search size={14} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients…" className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent" />
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 font-semibold text-gray-800">Name ({filtered.length})</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-800">Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(patient => (
              <tr key={patient.id} onClick={() => onOpenPanel(patient)} className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <PatientAvatar initials={patient.initials} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
                        {!patient.synced && <SyncTooltip />}
                      </div>
                      <p className="text-xs text-gray-500">{patient.dob}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-gray-700">{patient.phone}</p>
                  <p className="text-xs text-gray-500">{patient.email}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
