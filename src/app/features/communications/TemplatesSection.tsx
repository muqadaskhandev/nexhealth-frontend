import { useEffect, useState } from "react";
import {
  mapCommunicationTemplate,
  mapTemplateConfiguration,
  staffApi,
} from "../../lib/staff-api";
import type { CommunicationTemplate, TemplateConfiguration } from "../../types";
import { TemplatesListView } from "./TemplatesListView";
import { TemplateDetailView } from "./TemplateDetailView";
import { TemplatesCustomTab, TemplatesSettingsTab } from "./TemplatesCustomViews";

type HubTab = "default" | "custom" | "settings";
type View =
  | { name: "hub"; tab: HubTab }
  | { name: "detail"; templateId: string; returnTab: HubTab };

export function TemplatesSection({ initialSlug }: { initialSlug?: string } = {}) {
  const [view, setView] = useState<View>({ name: "hub", tab: "default" });
  const [booting, setBooting] = useState(Boolean(initialSlug));
  const [config, setConfig] = useState<TemplateConfiguration | null>(null);

  useEffect(() => {
    staffApi.templateConfig
      .get()
      .then((row) => setConfig(mapTemplateConfiguration(row)))
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (!initialSlug) return;
    let cancelled = false;
    setBooting(true);
    staffApi.communicationTemplates
      .bySlug(initialSlug)
      .then((row) => {
        if (!cancelled) {
          setView({
            name: "detail",
            templateId: mapCommunicationTemplate(row).id,
            returnTab: "default",
          });
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
        onBack={() => setView({ name: "hub", tab: view.returnTab })}
        onTemplateReplaced={(id) =>
          setView({ name: "detail", templateId: id, returnTab: view.returnTab })
        }
      />
    );
  }

  const tab = view.tab;
  const tabCls = (id: HubTab) =>
    `px-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
      tab === id
        ? "border-gray-900 text-gray-900"
        : "border-transparent text-gray-400 hover:text-gray-600"
    }`;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Templates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automated patient communication sequences
          {config?.customizeByAppointmentType ? " · customized by appointment type" : ""}.
        </p>
      </div>

      <div className="flex items-center gap-6 border-b border-border">
        <button type="button" className={tabCls("default")} onClick={() => setView({ name: "hub", tab: "default" })}>
          Default
        </button>
        <button type="button" className={tabCls("custom")} onClick={() => setView({ name: "hub", tab: "custom" })}>
          Custom
        </button>
        <button type="button" className={tabCls("settings")} onClick={() => setView({ name: "hub", tab: "settings" })}>
          Settings
        </button>
      </div>

      {tab === "default" && (
        <div className="-mx-4 sm:-mx-6">
          <TemplatesListView
            onOpen={(t: CommunicationTemplate) =>
              setView({ name: "detail", templateId: t.id, returnTab: "default" })
            }
          />
        </div>
      )}

      {tab === "custom" && (
        <TemplatesCustomTab
          enabled={!!config?.customizeByAppointmentType}
          onOpenTemplate={(id) => setView({ name: "detail", templateId: id, returnTab: "custom" })}
        />
      )}

      {tab === "settings" && (
        <TemplatesSettingsTab config={config} onConfigChange={setConfig} />
      )}
    </div>
  );
}
