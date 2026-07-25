import { useEffect, useState } from "react";
import { FormBuilderView } from "./FormBuilderView";
import { FormsListView } from "./FormsListView";
import { ManageFormsView } from "./ManageFormsView";
import { DigitizeModal } from "./DigitizeModal";
import { mapFormSubmission, mapFormTemplate, mapPatient, staffApi } from "../../lib/staff-api";
import type { FormSubmission, FormTemplate, Patient } from "../../types";

export function FormsSection() {
  const [view, setView] = useState<"list" | "manage" | "builder" | "digitize">("list");
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

  function refreshTemplates() {
    staffApi.forms.templates().then((rows) => setTemplates(rows.map(mapFormTemplate)));
  }

  useEffect(() => {
    staffApi.forms.submissions().then((rows) => setSubmissions(rows.map(mapFormSubmission)));
    staffApi.patients.list().then((rows) => setPatients(rows.map(mapPatient)));
    refreshTemplates();
  }, []);

  function openBuild() {
    setEditingTemplate(null);
    setView("builder");
  }

  function openEdit(template: FormTemplate) {
    setEditingTemplate(template);
    setView("builder");
  }

  if (view === "builder") {
    return (
      <FormBuilderView
        initial={editingTemplate ?? undefined}
        onExit={() => setView("manage")}
        onSaved={() => {
          refreshTemplates();
          setView("manage");
        }}
      />
    );
  }

  return (
    <>
      {view === "list" && (
        <FormsListView
          onManage={() => setView("manage")}
          submissions={submissions}
          patients={patients}
        />
      )}
      {view === "manage" && (
        <ManageFormsView
          onBack={() => setView("list")}
          onBuild={openBuild}
          onEdit={openEdit}
          onDigitize={() => setView("digitize")}
          templates={templates}
        />
      )}
      {view === "digitize" && (
        <>
          <ManageFormsView
            onBack={() => setView("list")}
            onBuild={openBuild}
            onEdit={openEdit}
            onDigitize={() => setView("digitize")}
            templates={templates}
          />
          <DigitizeModal
            onClose={() => setView("manage")}
            onSaved={() => {
              refreshTemplates();
              setView("manage");
            }}
          />
        </>
      )}
    </>
  );
}
