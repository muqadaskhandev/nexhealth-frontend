import { useState } from "react";
import { Archive, Copy, Search, UserPlus } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { SyncTooltip } from "../../components/shared/SyncTooltip";
import type { Patient } from "../../types";

export function PatientsListView({ patients, onOpenPanel, onCreateOpen, onViewArchived, onViewDuplicates }: {
  patients: Patient[]; onOpenPanel: (p: Patient) => void;
  onCreateOpen: () => void; onViewArchived: () => void; onViewDuplicates: () => void;
}) {
  const active = patients.filter(p => !p.archived);
  const archivedCount = patients.filter((p) => p.archived).length;
  const [search, setSearch] = useState("");
  const filtered = active.filter(p => !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search records, open a patient, and review activity from their profile.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onViewDuplicates}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Copy size={15} className="text-teal-600 shrink-0" />
            Review duplicates
          </button>
          <button
            type="button"
            onClick={onViewArchived}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Archive size={15} className="text-teal-600 shrink-0" />
            Archived
            {archivedCount > 0 && (
              <span className="ml-0.5 min-w-[1.25rem] h-5 px-1.5 rounded-md bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">
                {archivedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onCreateOpen}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
          >
            <UserPlus size={15} className="shrink-0" />
            Create patient
          </button>
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
