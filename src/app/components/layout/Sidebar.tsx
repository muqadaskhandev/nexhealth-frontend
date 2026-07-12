import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "../../data/mock-data";

export function Sidebar({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ communications: true, scheduling: true });
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const hasChildren = !!item.children;
          const isExpanded = expanded[item.id];
          const isActive = activeNav === item.id;
          return (
            <div key={item.id}>
              <button
                onClick={() => { if (hasChildren) toggle(item.id); else setActiveNav(item.id); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${isActive ? "bg-gray-900 text-white font-medium shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={isActive ? "text-white" : "text-gray-400"}>{item.icon}</span>
                  {item.label}
                </span>
                <span className="flex items-center gap-1">
                  {item.badge && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{item.badge}</span>}
                  {hasChildren && <span className={isActive ? "text-white/70" : "text-gray-400"}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>}
                </span>
              </button>
              {hasChildren && isExpanded && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {item.children!.map(child => (
                    <button key={child.id} onClick={() => setActiveNav(child.id)} className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${activeNav === child.id ? "text-teal-600 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
