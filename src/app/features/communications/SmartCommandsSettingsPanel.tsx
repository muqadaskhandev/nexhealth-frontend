import { useEffect, useState } from "react";
import {
  mapAppointmentType,
  mapFormTemplate,
  staffApi,
} from "../../lib/staff-api";
import {
  SMART_COMMAND_GROUPS,
  appointmentSlotCommandsFromTypes,
  formCommandsFromTemplates,
  type SmartCommandGroup,
} from "./smartCommands";

/**
 * Settings reference: Summary of Smart commands (from NexHealth help docs).
 * Read-only catalog — editing happens in Templates message editor.
 */
export function SmartCommandsSettingsPanel() {
  const [groups, setGroups] = useState<SmartCommandGroup[]>(SMART_COMMAND_GROUPS);

  useEffect(() => {
    Promise.all([
      staffApi.forms.templates().catch(() => []),
      staffApi.appointmentTypes.list().catch(() => []),
    ]).then(([forms, types]) => {
      setGroups(
        SMART_COMMAND_GROUPS.map((g) => {
          if (g.id === "forms") {
            return {
              ...g,
              commands: formCommandsFromTemplates(
                forms.map(mapFormTemplate).map((f) => ({ id: f.id, name: f.name }))
              ),
            };
          }
          if (g.id === "appointment_slots") {
            return {
              ...g,
              commands: appointmentSlotCommandsFromTypes(
                types.map(mapAppointmentType).map((t) => ({ id: t.id, name: t.name }))
              ),
            };
          }
          return g;
        })
      );
    });
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Smart commands</h2>
        <p className="text-sm text-gray-500 mt-1">
          Smart Commands are dynamic placeholders you insert into template messages. When a message
          is sent, each command is replaced with real patient, appointment, or practice data.
        </p>
      </div>

      <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        Available commands vary by template. To insert one: Templates → select a template → edit an
        Email or SMS step → click a Smart command.
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Note: NexHealth cannot change how your number displays on a recipient&apos;s phone. The
        phone&apos;s operating system shows either the saved contact name or the raw phone number —
        this is controlled by the recipient&apos;s device. To have your practice name appear, the
        patient must save your number as a contact.
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.id} className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">{group.label} commands</h3>
            {group.commands.length === 0 ? (
              <p className="text-sm text-gray-400">
                {group.id === "forms"
                  ? "No forms enabled yet. Create forms under Forms to see them here."
                  : group.id === "appointment_slots"
                    ? "No appointment types yet. Add types under Scheduling."
                    : "No commands in this category."}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {group.commands.map((cmd) => (
                  <li key={cmd.token} className="text-sm">
                    <span className="font-medium text-teal-700">{cmd.label}</span>
                    <span className="text-gray-400 font-mono text-xs ml-2">{`{{${cmd.token}}}`}</span>
                    <p className="text-gray-500 mt-0.5">{cmd.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
