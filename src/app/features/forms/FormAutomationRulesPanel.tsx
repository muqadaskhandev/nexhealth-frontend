import { useState } from "react";
import { Pencil } from "lucide-react";
import type { AppointmentType, RulePatientStatus } from "../../types";

export type AutomationRuleKey =
  | "patient_status"
  | "frequency"
  | "age"
  | "procedure_codes"
  | "appointment_types";

type Props = {
  formName: string;
  folder: string;
  sendAutomatically: boolean;
  onSendAutomaticallyChange: (value: boolean) => void;
  rulePatientStatus: RulePatientStatus;
  onRulePatientStatusChange: (value: RulePatientStatus) => void;
  ruleFrequencyMonths: number | null;
  onRuleFrequencyMonthsChange: (value: number | null) => void;
  ruleMinAge: number | null;
  onRuleMinAgeChange: (value: number | null) => void;
  ruleMaxAge: number | null;
  onRuleMaxAgeChange: (value: number | null) => void;
  ruleProcedureCodes: string[];
  onRuleProcedureCodesChange: (value: string[]) => void;
  ruleAppointmentTypeIds: string[];
  onRuleAppointmentTypeIdsChange: (value: string[]) => void;
  appointmentTypes: AppointmentType[];
  disabled?: boolean;
};

function patientStatusLabel(value: RulePatientStatus): string {
  if (value === "new") return "New patients only";
  if (value === "existing") return "Existing patients only";
  return "Any patients";
}

function frequencyLabel(months: number | null): string {
  if (months === null) return "Only once";
  if (months === 12) return "Every 12 months";
  if (months === 6) return "Every 6 months";
  return `Every ${months} months`;
}

function ageLabel(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Any age";
  if (min === 18 && max === null) return "Adults (18+)";
  if (min === null && max === 17) return "Minors (17 and under)";
  if (min !== null && max !== null) return `Ages ${min}–${max}`;
  if (min !== null) return `Age ${min}+`;
  if (max !== null) return `Age ${max} and under`;
  return "Any age";
}

function procedureCodesLabel(codes: string[]): string {
  if (codes.length === 0) return "Any procedure code";
  if (codes.length <= 2) return codes.join(", ");
  return `${codes.slice(0, 2).join(", ")} +${codes.length - 2}`;
}

function appointmentTypesLabel(ids: string[], types: AppointmentType[]): string {
  if (ids.length === 0) return "Any appointment type";
  const names = ids.map((id) => types.find((t) => t.id === id)?.name).filter(Boolean) as string[];
  if (names.length === 0) return "Any appointment type";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function FormAutomationRulesPanel({
  formName,
  folder,
  sendAutomatically,
  onSendAutomaticallyChange,
  rulePatientStatus,
  onRulePatientStatusChange,
  ruleFrequencyMonths,
  onRuleFrequencyMonthsChange,
  ruleMinAge,
  onRuleMinAgeChange,
  ruleMaxAge,
  onRuleMaxAgeChange,
  ruleProcedureCodes,
  onRuleProcedureCodesChange,
  ruleAppointmentTypeIds,
  onRuleAppointmentTypeIdsChange,
  appointmentTypes,
  disabled = false,
}: Props) {
  const [editingRule, setEditingRule] = useState<AutomationRuleKey | null>(null);

  const rules: { key: AutomationRuleKey; label: string; value: string }[] = [
    { key: "patient_status", label: "Patient status", value: patientStatusLabel(rulePatientStatus) },
    { key: "frequency", label: "Frequency", value: frequencyLabel(ruleFrequencyMonths) },
    { key: "age", label: "Age", value: ageLabel(ruleMinAge, ruleMaxAge) },
    { key: "procedure_codes", label: "Procedure codes", value: procedureCodesLabel(ruleProcedureCodes) },
    { key: "appointment_types", label: "Appointment types", value: appointmentTypesLabel(ruleAppointmentTypeIds, appointmentTypes) },
  ];

  return (
    <>
      <aside className="w-full sm:w-72 border-t sm:border-t-0 sm:border-l border-border bg-white flex-shrink-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Form name</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{formName || "Untitled form"}</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Folder</p>
            <p className="text-sm text-gray-700 truncate">{folder || "Custom"}</p>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Send automatically</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Patients that match the rules below will be asked to complete forms after confirming an appointment.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sendAutomatically}
              disabled={disabled}
              onClick={() => onSendAutomaticallyChange(!sendAutomatically)}
              className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${
                sendAutomatically ? "bg-teal-500" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  sendAutomatically ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {sendAutomatically && (
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div key={rule.key} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{rule.label}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{rule.value}</p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setEditingRule(rule.key)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label={`Edit ${rule.label}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {editingRule && (
        <FormAutomationRuleModal
          rule={editingRule}
          rulePatientStatus={rulePatientStatus}
          ruleFrequencyMonths={ruleFrequencyMonths}
          ruleMinAge={ruleMinAge}
          ruleMaxAge={ruleMaxAge}
          ruleProcedureCodes={ruleProcedureCodes}
          ruleAppointmentTypeIds={ruleAppointmentTypeIds}
          appointmentTypes={appointmentTypes}
          onSave={(patch) => {
            if (patch.rulePatientStatus !== undefined) onRulePatientStatusChange(patch.rulePatientStatus);
            if (patch.ruleFrequencyMonths !== undefined) onRuleFrequencyMonthsChange(patch.ruleFrequencyMonths);
            if (patch.ruleMinAge !== undefined) onRuleMinAgeChange(patch.ruleMinAge);
            if (patch.ruleMaxAge !== undefined) onRuleMaxAgeChange(patch.ruleMaxAge);
            if (patch.ruleProcedureCodes !== undefined) onRuleProcedureCodesChange(patch.ruleProcedureCodes);
            if (patch.ruleAppointmentTypeIds !== undefined) onRuleAppointmentTypeIdsChange(patch.ruleAppointmentTypeIds);
            setEditingRule(null);
          }}
          onCancel={() => setEditingRule(null)}
        />
      )}
    </>
  );
}

function FormAutomationRuleModal({
  rule,
  rulePatientStatus,
  ruleFrequencyMonths,
  ruleMinAge,
  ruleMaxAge,
  ruleProcedureCodes,
  ruleAppointmentTypeIds,
  appointmentTypes,
  onSave,
  onCancel,
}: {
  rule: AutomationRuleKey;
  rulePatientStatus: RulePatientStatus;
  ruleFrequencyMonths: number | null;
  ruleMinAge: number | null;
  ruleMaxAge: number | null;
  ruleProcedureCodes: string[];
  ruleAppointmentTypeIds: string[];
  appointmentTypes: AppointmentType[];
  onSave: (patch: {
    rulePatientStatus?: RulePatientStatus;
    ruleFrequencyMonths?: number | null;
    ruleMinAge?: number | null;
    ruleMaxAge?: number | null;
    ruleProcedureCodes?: string[];
    ruleAppointmentTypeIds?: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [patientStatus, setPatientStatus] = useState(rulePatientStatus);
  const [frequencyMonths, setFrequencyMonths] = useState<number | null>(ruleFrequencyMonths);
  const [minAge, setMinAge] = useState<number | null>(ruleMinAge);
  const [maxAge, setMaxAge] = useState<number | null>(ruleMaxAge);
  const [procedureInput, setProcedureInput] = useState(ruleProcedureCodes.join(", "));
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>(ruleAppointmentTypeIds);

  const titles: Record<AutomationRuleKey, string> = {
    patient_status: "Patient status",
    frequency: "Frequency",
    age: "Age",
    procedure_codes: "Procedure codes",
    appointment_types: "Appointment types",
  };

  function handleSave() {
    if (rule === "patient_status") onSave({ rulePatientStatus: patientStatus });
    else if (rule === "frequency") onSave({ ruleFrequencyMonths: frequencyMonths });
    else if (rule === "age") onSave({ ruleMinAge: minAge, ruleMaxAge: maxAge });
    else if (rule === "procedure_codes") {
      const codes = procedureInput
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter(Boolean);
      onSave({ ruleProcedureCodes: codes });
    } else if (rule === "appointment_types") onSave({ ruleAppointmentTypeIds: selectedTypeIds });
  }

  function toggleType(id: string) {
    setSelectedTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-gray-900">{titles[rule]}</h3>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {rule === "patient_status" && (
            <div className="space-y-2">
              {([
                ["any", "Any patients"],
                ["new", "New patients only"],
                ["existing", "Existing patients only"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="patient_status"
                    checked={patientStatus === value}
                    onChange={() => setPatientStatus(value)}
                    className="accent-gray-900"
                  />
                  <span className="text-sm text-gray-800">{label}</span>
                </label>
              ))}
              <p className="text-xs text-gray-400 pt-1">
                New patients have never had a completed appointment. Cancelled or missed appointments don&apos;t change this.
              </p>
            </div>
          )}

          {rule === "frequency" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  checked={frequencyMonths === null}
                  onChange={() => setFrequencyMonths(null)}
                  className="accent-gray-900"
                />
                <span className="text-sm text-gray-800">Only once</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  checked={frequencyMonths !== null}
                  onChange={() => setFrequencyMonths(frequencyMonths ?? 12)}
                  className="accent-gray-900"
                />
                <span className="text-sm text-gray-800">Repeat every</span>
                <input
                  type="number"
                  min={1}
                  value={frequencyMonths ?? 12}
                  disabled={frequencyMonths === null}
                  onChange={(e) => setFrequencyMonths(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 disabled:bg-gray-50"
                />
                <span className="text-sm text-gray-800">months</span>
              </label>
              <p className="text-xs text-gray-400 pt-1">
                For recurring forms, the timer starts after the patient completes the form for the first time.
              </p>
            </div>
          )}

          {rule === "age" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setMinAge(null); setMaxAge(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${minAge === null && maxAge === null ? "bg-teal-500 border-teal-500 text-white" : "border-gray-200 text-gray-600"}`}
                >
                  Any age
                </button>
                <button
                  type="button"
                  onClick={() => { setMinAge(null); setMaxAge(17); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${maxAge === 17 && minAge === null ? "bg-teal-500 border-teal-500 text-white" : "border-gray-200 text-gray-600"}`}
                >
                  17 and under
                </button>
                <button
                  type="button"
                  onClick={() => { setMinAge(18); setMaxAge(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${minAge === 18 && maxAge === null ? "bg-teal-500 border-teal-500 text-white" : "border-gray-200 text-gray-600"}`}
                >
                  18 and older
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Minimum age</label>
                  <input
                    type="number"
                    min={0}
                    value={minAge ?? ""}
                    onChange={(e) => setMinAge(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="No minimum"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Maximum age</label>
                  <input
                    type="number"
                    min={0}
                    value={maxAge ?? ""}
                    onChange={(e) => setMaxAge(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="No maximum"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            </div>
          )}

          {rule === "procedure_codes" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Procedure codes (OR logic)</label>
              <textarea
                value={procedureInput}
                onChange={(e) => setProcedureInput(e.target.value)}
                placeholder="Enter codes separated by commas — leave blank to match any procedure code"
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                The form sends if the appointment includes any of the selected codes.
              </p>
            </div>
          )}

          {rule === "appointment_types" && (
            <div>
              {appointmentTypes.length === 0 ? (
                <p className="text-sm text-gray-500">No appointment types configured — this rule will match any appointment type.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {appointmentTypes.map((at) => (
                    <button
                      key={at.id}
                      type="button"
                      onClick={() => toggleType(at.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedTypeIds.includes(at.id)
                          ? "bg-teal-500 border-teal-500 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-teal-300"
                      }`}
                    >
                      {at.name}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Leave all unselected to match any appointment type.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className="text-sm font-medium text-teal-600 hover:text-teal-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
