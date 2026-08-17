import { useState } from "react";
import { Search, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { DatePicker } from "../../components/shared/DatePicker";
import { dobInputBounds } from "../../lib/fieldFormat";
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
  const [tab, setTab] = useState<"existing" | "new">("existing");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showDrop, setShowDrop] = useState(false);

  const [newFirstName, setNewFirstName] = useState(submission.firstName);
  const [newLastName, setNewLastName] = useState(submission.lastName);
  const [newDob, setNewDob] = useState(submission.dob ?? "");
  const [newPhone, setNewPhone] = useState(submission.phone);
  const [newEmail, setNewEmail] = useState(submission.email);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const matches = patients.filter(
    (p) => !p.archived && search.length > 0 && `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleSyncForms() {
    if (submitting) return;
    setError(null);

    if (tab === "existing") {
      if (!selected) {
        setError("Select the patient this submission belongs to.");
        return;
      }
      runAssign(selected.id);
      return;
    }

    if (!newFirstName.trim() || !newLastName.trim()) {
      setError("Enter the new patient's first and last name.");
      return;
    }
    setSubmitting(true);
    staffApi.patients
      .create({
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        dob: newDob || null,
        phone: newPhone.trim(),
        email: newEmail.trim(),
      })
      .then((created) => runAssign(created.id))
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        const msg = apiErr?.detail || "Could not create this patient — please try again.";
        setError(msg);
        toastError(msg);
        setSubmitting(false);
      });
  }

  function runAssign(patientId: string) {
    setSubmitting(true);
    staffApi.forms.publicSubmissions
      .assign(submission.id, patientId)
      .then(() => {
        toastSuccess("Forms synced");
        onAssigned();
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        const msg = apiErr?.detail || "Could not sync these forms — please try again.";
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
          <h2 className="text-lg font-bold text-gray-900">
            {submission.firstName} {submission.lastName} submitted forms, which patient record should we sync them to?
          </h2>
          <IconButton label="Close" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0 ml-3">
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
            <p className="text-xs text-gray-500 mt-1 font-medium">Forms</p>
            <p className="text-xs text-gray-500">{submission.formNames.join(", ") || "—"}</p>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab("existing")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "existing" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Find existing patient
            </button>
            <button
              onClick={() => setTab("new")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              Create new patient
            </button>
          </div>

          {tab === "existing" ? (
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
              <div className="mt-3 flex items-start gap-2 px-3.5 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                Syncing forms will create a family file to store forms.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">First name</label>
                  <input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                  <input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date of birth</label>
                <DatePicker
                  value={newDob}
                  min={dobInputBounds().min}
                  max={dobInputBounds().max}
                  onChange={setNewDob}
                  aria-label="Date of birth"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800">
            Your health record system is the source of truth for your patient list. Always manage patients (create, archive, make inactive, or remove duplicates) from there first. NexHealth's Synchronizer automatically updates your patient list from the health record system within minutes — add a patient there, then return to Forms.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncForms}
              disabled={submitting}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? "Syncing…" : "Sync forms"}
            </button>
            <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
