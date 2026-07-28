import { MessagesView } from "./MessagesView";
import { TemplatesSection } from "./TemplatesSection";
import { PlaceholderView } from "../../components/shared/PlaceholderView";

const SLUG_BY_NAV: Record<string, string> = {
  reminders: "reminders",
  recalls: "recalls",
  reviews: "reviews",
};

export function CommunicationsSection({ activeNav = "messages" }: { activeNav?: string }) {
  if (activeNav === "messages" || activeNav === "communications") {
    return <MessagesView />;
  }

  if (activeNav === "campaigns") {
    return (
      <div className="px-4 sm:px-6 py-5 space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <p className="text-sm text-gray-500">
          One-off outreach campaigns. Use Templates for recurring automations.
        </p>
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700">No campaigns yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Campaign builder will land in a follow-up milestone.
          </p>
        </div>
      </div>
    );
  }

  const slug = SLUG_BY_NAV[activeNav];
  if (slug) {
    return <TemplatesSection initialSlug={slug} />;
  }

  return <PlaceholderView title="Communications" />;
}
