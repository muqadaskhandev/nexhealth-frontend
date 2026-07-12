import { useEffect, useState } from "react";
import { FormBuilderView } from "./FormBuilderView";
import { FormsListView } from "./FormsListView";
import { ManageFormsView } from "./ManageFormsView";
import { DigitizeModal } from "./DigitizeModal";
import { mapFormSubmission, mapPatient, staffApi } from "../../lib/staff-api";
import type { FormSubmission, Patient } from "../../types";

export function FormsSection() {
  const [view, setView] = useState<"list" | "manage" | "builder" | "digitize">("list");
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    staffApi.forms.submissions().then((rows) => setSubmissions(rows.map(mapFormSubmission)));
    staffApi.patients.list().then((rows) => setPatients(rows.map(mapPatient)));
  }, []);

  if (view === "builder") return <FormBuilderView onExit={() => setView("manage")} />;

  return (
    <>
      {view === "list" && (
        <FormsListView
          onManage={() => setView("manage")}
          submissions={submissions}
          patients={patients}
        />
      )}
      {view === "manage"  && <ManageFormsView onBack={() => setView("list")} onBuild={() => setView("builder")} onDigitize={() => setView("digitize")} />}
      {view === "digitize" && (
        <>
          <ManageFormsView onBack={() => setView("list")} onBuild={() => setView("builder")} onDigitize={() => setView("digitize")} />
          <DigitizeModal onClose={() => setView("manage")} />
        </>
      )}
    </>
  );
}
