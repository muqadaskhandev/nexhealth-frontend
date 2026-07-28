import { useEffect, useState } from "react";
import { mapCommunicationTemplate, staffApi } from "../../lib/staff-api";
import { TemplatesListView } from "./TemplatesListView";
import { TemplateDetailView } from "./TemplateDetailView";
import type { CommunicationTemplate } from "../../types";

type View =
  | { name: "list" }
  | { name: "detail"; templateId: string };

export function TemplatesSection({ initialSlug }: { initialSlug?: string } = {}) {
  const [view, setView] = useState<View>({ name: "list" });
  const [booting, setBooting] = useState(Boolean(initialSlug));

  useEffect(() => {
    if (!initialSlug) return;
    let cancelled = false;
    setBooting(true);
    staffApi.communicationTemplates
      .bySlug(initialSlug)
      .then((row) => {
        if (!cancelled) {
          setView({ name: "detail", templateId: mapCommunicationTemplate(row).id });
        }
      })
      .catch(() => {
        /* fall back to list */
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialSlug]);

  if (booting) {
    return (
      <div className="px-6 py-5">
        <p className="text-sm text-gray-400">Opening template…</p>
      </div>
    );
  }

  if (view.name === "detail") {
    return (
      <TemplateDetailView
        templateId={view.templateId}
        onBack={() => setView({ name: "list" })}
      />
    );
  }

  return (
    <TemplatesListView
      onOpen={(t: CommunicationTemplate) => setView({ name: "detail", templateId: t.id })}
    />
  );
}
