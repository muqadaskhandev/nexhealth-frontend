/** Date of birth picker for patient verify screens (forms, agent, packets). */
import { DatePicker } from "../components/shared/DatePicker";
import { dobInputBounds } from "../lib/fieldFormat";

export function DobInput({
  value,
  onChange,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const bounds = dobInputBounds();
  return (
    <div className={className}>
      <DatePicker
        value={value || ""}
        onChange={onChange}
        min={bounds.min}
        max={bounds.max}
        disabled={disabled}
        aria-label="Date of birth"
        placeholder="MM/DD/YYYY"
      />
      <p className="text-xs text-gray-500 mt-1.5">Use the same date of birth on your patient record.</p>
    </div>
  );
}
