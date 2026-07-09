import { useState, type Dispatch, type SetStateAction } from "react";
import { PatientsListView } from "./PatientsListView";
import { ArchivedPatientsView } from "./ArchivedPatientsView";
import { CreatePatientModal } from "./CreatePatientModal";
import type { Patient } from "../../types";

export function PatientsSection({ patients, setPatients, onOpenPanel }: {
  patients: Patient[]; setPatients: Dispatch<SetStateAction<Patient[]>>;
  onOpenPanel: (p: Patient) => void;
}) {
  const [view, setView] = useState<"list" | "archived">("list");
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      {view === "list" ? (
        <PatientsListView patients={patients} onOpenPanel={onOpenPanel} onCreateOpen={() => setShowCreate(true)} onViewArchived={() => setView("archived")} />
      ) : (
        <ArchivedPatientsView
          patients={patients}
          onOpenPanel={onOpenPanel}
          onBack={() => setView("list")}
          onUnarchive={(id) => setPatients(prev => prev.map(p => p.id === id ? { ...p, archived: false } : p))}
        />
      )}
      {showCreate && <CreatePatientModal onClose={() => setShowCreate(false)} onSave={p => setPatients(prev => [p, ...prev])} />}
    </>
  );
}
