import { Menu, Settings } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { BrandLogo } from "../branding/BrandLogo";
import { usePractice } from "../../hooks/usePractice";
import { GlobalSearch } from "./GlobalSearch";
import { LocationPicker } from "./LocationPicker";
import { UserMenu } from "./UserMenu";
import type { Patient } from "../../types";

export function TopBar({ onOpenSettings, onSelectPatient }: { onOpenSettings: () => void; onSelectPatient: (patient: Patient) => void }) {
  const { user } = useAuth();
  const practice = usePractice(user?.account_type === "practice");

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 lg:hidden"><Menu size={18} /></button>
      {/* <BrandLogo
        logoUrl={practice?.logo_url}
        alt={practice?.name || "NexHealth"}
        className="w-[180px] h-auto object-contain flex-shrink-0"
      /> */}
      <GlobalSearch onSelectPatient={onSelectPatient} />
      <div className="flex-1 hidden lg:block" />
      <LocationPicker />
      <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
      <button
        type="button"
        onClick={onOpenSettings}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
      <UserMenu />
    </header>
  );
}
