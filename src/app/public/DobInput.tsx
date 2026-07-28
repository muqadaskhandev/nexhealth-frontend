/** Clear date-of-birth picker for patient verify screens (forms, agent, packets). */
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
  return (
    <div className={className}>
      <input
        type="date"
        value={value || ""}
        disabled={disabled}
        max={new Date().toISOString().slice(0, 10)}
        min="1900-01-01"
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50 disabled:text-gray-400"
        aria-label="Date of birth"
      />
      <p className="text-xs text-gray-500 mt-1.5">Use the same date of birth on your patient record.</p>
    </div>
  );
}
