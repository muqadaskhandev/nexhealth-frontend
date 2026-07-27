import { useState } from "react";
import { Archive, Copy, Mail, Phone, Search, UserPlus } from "lucide-react";
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
  const filtered = active.filter(p => !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} patient{filtered.length === 1 ? "" : "s"} at this location
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onViewDuplicates}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-teal-200 transition-colors"
          >
            <Copy size={15} className="text-teal-600 shrink-0" />
            Review duplicates
          </button>
          <button
            type="button"
            onClick={onViewArchived}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-teal-200 transition-colors"
          >
            <Archive size={15} className="text-teal-600 shrink-0" />
            Archived
            {archivedCount > 0 && (
              <span className="ml-0.5 min-w-[1.25rem] h-5 px-1.5 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold flex items-center justify-center">
                {archivedCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onCreateOpen}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-xl hover:bg-teal-600 transition-colors shadow-sm"
          >
            <UserPlus size={15} className="shrink-0" />
            Create patient
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-border rounded-xl max-w-md shadow-sm">
        <Search size={15} className="text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700">No patients found</p>
          <p className="text-sm text-gray-400 mt-1">Try another search or create a patient.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filtered.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => onOpenPanel(patient)}
              className="group text-left bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-teal-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <PatientAvatar initials={patient.initials} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-gray-900 truncate group-hover:text-teal-800 transition-colors">
                      {patient.firstName} {patient.lastName}
                    </span>
                    {!patient.synced && <SyncTooltip />}
                  </div>
                  {patient.preferredName && patient.preferredName !== `${patient.firstName} ${patient.lastName}` && (
                    <p className="text-xs text-teal-700 mt-0.5 truncate">Goes by {patient.preferredName}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {patient.dob}
                    {patient.gender ? ` · ${patient.gender}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                  <Phone size={13} className="text-teal-500 shrink-0" />
                  <span className="truncate">{patient.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                  <Mail size={13} className="text-teal-500 shrink-0" />
                  <span className="truncate">{patient.email || "No email"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
