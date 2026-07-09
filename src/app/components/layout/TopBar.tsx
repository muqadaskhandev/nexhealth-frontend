import { Menu, Settings } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { LocationPicker } from "./LocationPicker";
import { UserMenu } from "./UserMenu";

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 lg:hidden"><Menu size={18} /></button>
      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 hidden sm:flex">
        <span className="text-white text-xs font-bold" style={{ fontFamily: "serif" }}>n</span>
      </div>
      <GlobalSearch />
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
