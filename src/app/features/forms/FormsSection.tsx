import { useState } from "react";
import { FormBuilderView } from "./FormBuilderView";
import { FormsListView } from "./FormsListView";
import { ManageFormsView } from "./ManageFormsView";
import { DigitizeModal } from "./DigitizeModal";

export function FormsSection() {
  const [view, setView] = useState<"list" | "manage" | "builder" | "digitize">("list");

  if (view === "builder") return <FormBuilderView onExit={() => setView("manage")} />;

  return (
    <>
      {view === "list"    && <FormsListView   onManage={() => setView("manage")} />}
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
