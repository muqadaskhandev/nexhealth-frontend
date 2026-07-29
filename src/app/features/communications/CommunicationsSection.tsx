import { MessagesView } from "./MessagesView";
import { TemplatesSection } from "./TemplatesSection";
import { CampaignsView } from "./CampaignsView";
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
    return <CampaignsView />;
  }

  const slug = SLUG_BY_NAV[activeNav];
  if (slug) {
    return <TemplatesSection initialSlug={slug} />;
  }

  return <PlaceholderView title="Communications" />;
}
