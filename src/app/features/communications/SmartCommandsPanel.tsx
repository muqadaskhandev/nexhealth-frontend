import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  SMART_COMMAND_GROUPS,
  wrapSmartCommand,
  type SmartCommand,
  type SmartCommandGroup,
} from "./smartCommands";

export function SmartCommandsPanel({
  disabled,
  onInsert,
}: {
  disabled?: boolean;
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SMART_COMMAND_GROUPS.map((g) => [g.id, g.id === "company" || g.id === "location" || g.id === "patient"]))
  );

  const groups = useMemo(() => SMART_COMMAND_GROUPS, []);

  function toggleGroup(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
      >
        Smart commands
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>

      {open && (
        <div className="border-t border-border max-h-72 overflow-y-auto">
          <p className="px-3.5 py-2 text-[11px] text-gray-400 bg-gray-50/80">
            Available commands vary by template. Hover a command for details.
          </p>
          {groups.map((group) => (
            <CommandGroup
              key={group.id}
              group={group}
              expanded={!!expanded[group.id]}
              disabled={disabled}
              onToggle={() => toggleGroup(group.id)}
              onInsert={onInsert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommandGroup({
  group,
  expanded,
  disabled,
  onToggle,
  onInsert,
}: {
  group: SmartCommandGroup;
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onInsert: (token: string) => void;
}) {
  return (
    <div className="border-t border-border/70">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {group.label}
      </button>
      {expanded && (
        <ul className="pb-1">
          {group.commands.map((cmd) => (
            <CommandRow
              key={cmd.token}
              command={cmd}
              disabled={disabled}
              onInsert={onInsert}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommandRow({
  command,
  disabled,
  onInsert,
}: {
  command: SmartCommand;
  disabled?: boolean;
  onInsert: (token: string) => void;
}) {
  return (
    <li className="relative group/cmd px-2">
      <button
        type="button"
        disabled={disabled}
        title={command.description}
        onClick={() => onInsert(wrapSmartCommand(command.token))}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">(x)</span>
        <span className="truncate font-medium">{command.label}</span>
      </button>
      <div className="pointer-events-none absolute left-3 right-3 bottom-full mb-1 z-20 hidden group-hover/cmd:block">
        <div className="rounded-md bg-gray-900 text-white text-xs px-2.5 py-1.5 shadow-lg leading-snug">
          {command.description}
        </div>
      </div>
    </li>
  );
}
