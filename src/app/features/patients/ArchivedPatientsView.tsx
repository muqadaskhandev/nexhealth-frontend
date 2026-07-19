import { ArrowLeft } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { SyncTooltip } from "../../components/shared/SyncTooltip";
import type { Patient } from "../../types";

export function ArchivedPatientsView({ patients, onOpenPanel, onBack, onUnarchive }: {
  patients: Patient[]; onOpenPanel: (p: Patient) => void;
  onBack: () => void; onUnarchive: (id: string) => void;
}) {
  const archived = patients.filter(p => p.archived);
  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
          <ArrowLeft size={15} />Back to patients
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Archived patients</h1>
      </div>
      {archived.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-gray-400">No archived patients</div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Name ({archived.length})</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-800">Contact</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {archived.map(patient => (
                <tr key={patient.id} onClick={() => onOpenPanel(patient)} className="border-b border-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <PatientAvatar initials={patient.initials} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
                          {!patient.synced && <SyncTooltip />}
                          <span className="px-1.5 py-0.5 text-[10px] font-medium border border-pink-400 text-pink-600 rounded">Archived</span>
                        </div>
                        <p className="text-xs text-gray-500">{patient.dob}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-gray-700">{patient.phone}</p>
                    <p className="text-xs text-gray-500">{patient.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onUnarchive(patient.id)}
                      className="px-3 py-1.5 text-sm font-medium border border-pink-400 text-pink-600 rounded-lg hover:bg-pink-50 transition-colors whitespace-nowrap"
                    >
                      Unarchive patient
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
