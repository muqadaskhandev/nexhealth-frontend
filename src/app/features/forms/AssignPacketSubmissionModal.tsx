import { useState } from "react";
import { Search, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import type { Patient, PublicPacketSubmission } from "../../types";

export function AssignPacketSubmissionModal({
  submission,
  patients,
  onClose,
  onAssigned,
}: {
  submission: PublicPacketSubmission;
  patients: Patient[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const matches = patients.filter(
    (p) => !p.archived && search.length > 0 && `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleAssign() {
    if (submitting) return;
    setError(null);
    if (!selected) {
      setError("Select the patient this submission belongs to.");
      return;
    }
    setSubmitting(true);
    staffApi.forms.publicSubmissions
      .assign(submission.id, selected.id)
      .then(() => {
        toastSuccess(`Synced to ${selected.firstName} ${selected.lastName}`);
        onAssigned();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        const msg = apiErr?.detail || "Could not assign this submission — please try again.";
        setError(msg);
        toastError(msg);
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Assign &amp; sync</h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0">
            <X size={16} />
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-5">
          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}

          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-1">
            <p className="text-sm font-semibold text-gray-900">{submission.firstName} {submission.lastName}</p>
            <p className="text-xs text-gray-500">
              {submission.dob && <>DOB {submission.dob} · </>}
              {submission.phone || "No phone"} · {submission.email || "No email"}
            </p>
            <p className="text-xs text-gray-500">Packet: {submission.packetName}</p>
            <p className="text-xs text-gray-500">Forms: {submission.formNames.join(", ") || "—"}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Connect to patient</label>
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors ${showDrop ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-200"}`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={selected ? `${selected.firstName} ${selected.lastName}` : search}
                  onChange={(e) => { setSearch(e.target.value); setSelected(null); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Search patients by name"
                  className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
                />
                {selected && (
                  <IconButton label="Clear" onClick={() => { setSelected(null); setSearch(""); }} className="text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </IconButton>
                )}
              </div>
              {showDrop && matches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelected(p); setSearch(""); setShowDrop(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-500 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">{p.initials}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-gray-400">{p.dob}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={submitting}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {submitting ? "Syncing…" : "Assign & sync"}
          </button>
        </div>
      </div>
    </div>
  );
}
