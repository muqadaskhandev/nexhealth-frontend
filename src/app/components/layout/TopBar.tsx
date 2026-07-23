import { Menu } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { BrandLogo } from "../branding/BrandLogo";
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
    <header className="h-16 bg-white border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button
        type="button"
        title="Menu"
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 lg:hidden"
      >
        <Menu size={18} />
      </button>
      <BrandLogo
        logoUrl={logoUrl}
        alt={practice?.name || "NexHealth"}
        className="hidden sm:block w-[140px] h-8 object-contain flex-shrink-0"
      />
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
