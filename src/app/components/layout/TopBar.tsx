import { Menu } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { TopBarLogo } from "../branding/TopBarLogo";
import { usePractice } from "../../hooks/usePractice";
import { GlobalSearch } from "./GlobalSearch";
import { LocationPicker } from "./LocationPicker";
import { SettingsMenu } from "./SettingsMenu";
import { UserMenu } from "./UserMenu";
import type { Patient } from "../../types";

export function TopBar({
  onOpenSettings,
  onOpenUsers,
  onSelectPatient,
}: {
  onOpenSettings: () => void;
  onOpenUsers?: () => void;
  onSelectPatient: (patient: Patient) => void;
}) {
  const { user, activeLocation } = useAuth();
  const practice = usePractice(user?.account_type === "practice");
  const isAdmin = user?.role === "admin";
  const logoUrl = activeLocation?.logo_url || practice?.logo_url;

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 sm:px-5 gap-3 sm:gap-4 flex-shrink-0">
      <button
        type="button"
        title="Menu"
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
      <TopBarLogo logoUrl={logoUrl} alt={practice?.name || "VaraSync"} />
      <GlobalSearch onSelectPatient={onSelectPatient} />
      <div className="flex-1 hidden lg:block" />
      <LocationPicker />
      <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
      <SettingsMenu
        isAdmin={!!isAdmin}
        onOpenSettings={onOpenSettings}
        onOpenUsers={onOpenUsers}
      />
      <UserMenu />
    </header>
  );
}
