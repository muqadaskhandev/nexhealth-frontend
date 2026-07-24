import { useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon, Users } from "lucide-react";

type Props = {
  onOpenSettings: () => void;
  onOpenUsers?: () => void;
  isAdmin?: boolean;
};

/** Gear menu matching NexHealth: Settings / Manage users. */
export function SettingsMenu({ onOpenSettings, onOpenUsers, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors ${
          open ? "ring-2 ring-teal-200 bg-gray-50" : ""
        }`}
        aria-label="Settings menu"
        aria-expanded={open}
      >
        <SettingsIcon size={18} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
          >
            Settings
          </button>
          {isAdmin && onOpenUsers && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenUsers();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2"
            >
              <Users size={14} className="text-gray-400" />
              Manage staff
            </button>
          )}
        </div>
      )}
    </div>
  );
}
