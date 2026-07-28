import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  mapAppointmentType,
  mapFormTemplate,
  staffApi,
} from "../../lib/staff-api";
import {
  SMART_COMMAND_GROUPS,
  appointmentSlotCommandsFromTypes,
  filterSmartCommandGroups,
  formCommandsFromTemplates,
  wrapSmartCommand,
  type SmartCommand,
  type SmartCommandGroup,
} from "./smartCommands";

export function SmartCommandsPanel({
  disabled,
  templateSlug,
  onInsert,
}: {
  disabled?: boolean;
  /** When set, only show commands available for this template. */
  templateSlug?: string;
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [formCommands, setFormCommands] = useState<SmartCommand[]>([]);
  const [slotCommands, setSlotCommands] = useState<SmartCommand[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      staffApi.forms.templates().catch(() => []),
      staffApi.appointmentTypes.list().catch(() => []),
    ]).then(([forms, types]) => {
      if (cancelled) return;
      setFormCommands(
        formCommandsFromTemplates(
          forms.map(mapFormTemplate).map((f) => ({ id: f.id, name: f.name }))
        )
      );
      setSlotCommands(
        appointmentSlotCommandsFromTypes(
          types.map(mapAppointmentType).map((t) => ({ id: t.id, name: t.name }))
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const merged: SmartCommandGroup[] = SMART_COMMAND_GROUPS.map((g) => {
      if (g.id === "forms") return { ...g, commands: formCommands };
      if (g.id === "appointment_slots") return { ...g, commands: slotCommands };
      return g;
    });
    return filterSmartCommandGroups(merged, templateSlug);
  }, [formCommands, slotCommands, templateSlug]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.id] === undefined) {
          next[g.id] = g.id === "company" || g.id === "location" || g.id === "patient";
        }
      }
      return next;
    });
  }, [groups]);

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
          {groups.length === 0 ? (
            <p className="px-3.5 py-4 text-sm text-gray-400">No smart commands for this template.</p>
          ) : (
            groups.map((group) => (
              <CommandGroup
                key={group.id}
                group={group}
                expanded={!!expanded[group.id]}
                disabled={disabled}
                onToggle={() => toggleGroup(group.id)}
                onInsert={onInsert}
              />
            ))
          )}
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
