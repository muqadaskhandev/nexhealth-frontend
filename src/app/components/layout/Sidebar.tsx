import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NAV_ITEMS } from "../../data/mock-data";

const NAV_SECTIONS: { label: string; ids: string[] }[] = [
  { label: "Overview", ids: ["home", "activity"] },
  { label: "Patients", ids: ["patients"] },
  { label: "Engagement", ids: ["templates", "communications"] },
  { label: "Scheduling", ids: ["scheduling"] },
  { label: "Practice", ids: ["forms", "payments", "verification"] },
];

function childIds(item: (typeof NAV_ITEMS)[number]): string[] {
  return item.children?.map((c) => c.id) ?? [];
}

function isItemActive(activeNav: string, item: (typeof NAV_ITEMS)[number]): boolean {
  if (activeNav === item.id) return true;
  return childIds(item).includes(activeNav);
}

export function Sidebar({
  activeNav,
  setActiveNav,
}: {
  activeNav: string;
  setActiveNav: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.children) {
        initial[item.id] = childIds(item).includes(activeNav) || ["communications", "scheduling"].includes(item.id);
      }
    }
    return initial;
  });

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      if (item.children && childIds(item).includes(activeNav)) {
        setExpanded((prev) => ({ ...prev, [item.id]: true }));
      }
    }
  }, [activeNav]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="w-60 flex-shrink-0 h-full flex flex-col border-r border-gray-200/80 bg-gradient-to-b from-gray-50 to-white">
      <div className="px-4 py-4 border-b border-gray-200/60">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Navigation</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((item) => section.ids.includes(item.id));
          if (items.length === 0) return null;

          return (
            <div key={section.label}>
              <p className="px-2.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const hasChildren = !!item.children;
                  const isExpanded = expanded[item.id] ?? false;
                  const active = isItemActive(activeNav, item);
                  const parentOnlyActive = activeNav === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasChildren) toggle(item.id);
                          else setActiveNav(item.id);
                        }}
                        className={`group w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-sm transition-all ${
                          parentOnlyActive
                            ? "bg-teal-500 text-white shadow-sm shadow-teal-500/20"
                            : active
                              ? "bg-teal-50 text-teal-800"
                              : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                              parentOnlyActive
                                ? "bg-white/20 text-white"
                                : active
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-white text-gray-400 group-hover:text-teal-600 border border-gray-200/80"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate font-medium">{item.label}</span>
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          {item.badge != null && item.badge > 0 && (
                            <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                          {hasChildren && (
                            <span className={parentOnlyActive ? "text-white/80" : "text-gray-400"}>
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                          )}
                        </span>
                      </button>

                      {hasChildren && isExpanded && (
                        <div className="mt-1 ml-5 pl-3 border-l-2 border-teal-100 space-y-0.5">
                          {item.children!.map((child) => {
                            const childActive = activeNav === child.id;
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => setActiveNav(child.id)}
                                className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                                  childActive
                                    ? "bg-teal-500 text-white font-medium shadow-sm shadow-teal-500/15"
                                    : "text-gray-500 hover:bg-white hover:text-gray-800"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                    childActive ? "bg-white" : "bg-gray-300"
                                  }`}
                                />
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
