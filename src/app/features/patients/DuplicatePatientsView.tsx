import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { PatientAvatar } from "../../components/shared/PatientAvatar";
import { SyncTooltip } from "../../components/shared/SyncTooltip";
import { staffApi, mapPatient } from "../../lib/staff-api";
import type { Patient } from "../../types";

export function DuplicatePatientsView({ onOpenPanel, onBack }: {
  onOpenPanel: (p: Patient) => void;
  onBack: () => void;
}) {
  const [groups, setGroups] = useState<Patient[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    staffApi.patients
      .duplicates()
      .then((rows) => { if (!cancelled) setGroups(rows.map((g) => g.map(mapPatient))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full min-w-0 px-6 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
          <ArrowLeft size={15} />Back to patients
        </button>
        <span className="text-gray-300">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Duplicate patients</h1>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-gray-400">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-gray-400">No duplicate patients found.</div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, i) => {
            const hasNonSynced = group.some((p) => !p.synced);
            return (
              <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {group.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => onOpenPanel(patient)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <PatientAvatar initials={patient.initials} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</span>
                          {!patient.synced && <SyncTooltip />}
                        </div>
                        <p className="text-xs text-gray-500">{patient.dob}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-700">{patient.phone}</p>
                        <p className="text-xs text-gray-500">{patient.email}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {hasNonSynced ? (
                  <div className="px-5 py-3.5 bg-teal-50 border-t border-teal-100 text-sm text-teal-900">
                    One of these records was created in NexHealth and isn't synced to your health record system.
                    Open it and use <span className="font-semibold">Archive patient</span> from Actions to resolve this duplicate.
                  </div>
                ) : (
                  <div className="px-5 py-4 bg-red-50 border-t border-red-100 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Attempt to manage duplicates from your health record system</span> (either by deleting, archiving,
                      or marking the patient as inactive). Once updated in your practice management system, the changes should sync to NexHealth within 24 hours.
                    </p>
                    <p className="text-sm text-gray-800 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                      If you're unable to manage the duplicate in your system, removing it can be handled by NexHealth support.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
