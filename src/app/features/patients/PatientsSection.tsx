import { useState, type Dispatch, type SetStateAction } from "react";
import { PatientsListView } from "./PatientsListView";
import { ArchivedPatientsView } from "./ArchivedPatientsView";
import { DuplicatePatientsView } from "./DuplicatePatientsView";
import { CreatePatientModal } from "./CreatePatientModal";
import type { Patient } from "../../types";

export function PatientsSection({
  patients,
  setPatients,
  onOpenPanel,
  onCreatePatient,
  onSavePatient,
}: {
  patients: Patient[];
  setPatients: Dispatch<SetStateAction<Patient[]>>;
  onOpenPanel: (p: Patient) => void;
  onCreatePatient: (p: Partial<Patient>) => Promise<Patient>;
  onSavePatient: (p: Patient) => Promise<Patient>;
}) {
  const [view, setView] = useState<"list" | "archived" | "duplicates">("list");
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      {view === "list" && (
        <PatientsListView
          patients={patients}
          onOpenPanel={onOpenPanel}
          onCreateOpen={() => setShowCreate(true)}
          onViewArchived={() => setView("archived")}
          onViewDuplicates={() => setView("duplicates")}
        />
      )}
      {view === "archived" && (
        <ArchivedPatientsView
          patients={patients}
          onOpenPanel={onOpenPanel}
          onBack={() => setView("list")}
          onUnarchive={async (id) => {
            const p = patients.find((x) => x.id === id);
            if (!p) return;
            const saved = await onSavePatient({ ...p, archived: false });
            setPatients((prev) => prev.map((x) => (x.id === id ? saved : x)));
          }}
        />
      )}
      {view === "duplicates" && (
        <DuplicatePatientsView
          onOpenPanel={onOpenPanel}
          onBack={() => setView("list")}
        />
      )}
      {showCreate && (
        <CreatePatientModal
          onClose={() => setShowCreate(false)}
          onSave={async (p) => {
            const saved = await onCreatePatient(p);
            setPatients((prev) => [saved, ...prev]);
          }}
        />
      )}
    </>
  );
}
