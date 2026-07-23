import { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { IconButton } from "../shared/IconButton";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <IconButton label="Account" onClick={() => setOpen(v => !v)} className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center hover:opacity-90 transition-opacity">
        {user?.initials ?? <User size={16} />}
      </IconButton>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || "—"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{user?.role}</span>
          </div>
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
            <LogOut size={15} className="text-gray-400" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
