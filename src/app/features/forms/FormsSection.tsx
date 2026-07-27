import { useEffect, useState } from "react";
import { FormBuilderView } from "./FormBuilderView";
import { FormsListView } from "./FormsListView";
import { ManageFormsView } from "./ManageFormsView";
import { DigitizeModal } from "./DigitizeModal";
import { FormsSettingsView } from "./FormsSettingsView";
import { mapFormPacket, mapFormSubmission, mapFormTemplate, mapPatient, staffApi } from "../../lib/staff-api";
import type { FormPacket, FormSubmission, FormTemplate, Patient } from "../../types";

export function FormsSection() {
  const [view, setView] = useState<"list" | "manage" | "builder" | "digitize" | "settings">("list");
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [packets, setPackets] = useState<FormPacket[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

  function refreshTemplates() {
    staffApi.forms.templates().then((rows) => setTemplates(rows.map(mapFormTemplate)));
  }

  function refreshPackets() {
    staffApi.forms.packets.list().then((rows) => setPackets(rows.map(mapFormPacket)));
  }

  useEffect(() => {
    staffApi.forms.submissions().then((rows) => setSubmissions(rows.map(mapFormSubmission)));
    staffApi.patients.list().then((rows) => setPatients(rows.map(mapPatient)));
    refreshTemplates();
    refreshPackets();
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
          onSettings={() => setView("settings")}
          submissions={submissions}
          patients={patients}
          templates={templates}
          packets={packets}
        />
      )}
      {view === "settings" && <FormsSettingsView onBack={() => setView("list")} />}
      {view === "manage" && (
        <ManageFormsView
          onBack={() => setView("list")}
          onBuild={openBuild}
          onEdit={openEdit}
          onDigitize={() => setView("digitize")}
          onRefresh={refreshTemplates}
          templates={templates}
          packets={packets}
          onRefreshPackets={refreshPackets}
        />
      )}
      {view === "digitize" && (
        <>
          <ManageFormsView
            onBack={() => setView("list")}
            onBuild={openBuild}
            onEdit={openEdit}
            onDigitize={() => setView("digitize")}
            onRefresh={refreshTemplates}
            templates={templates}
            packets={packets}
            onRefreshPackets={refreshPackets}
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
