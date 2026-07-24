export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`inline-flex items-center w-10 h-6 px-1 rounded-full flex-shrink-0 transition-colors ${on ? "bg-teal-500" : "bg-gray-300"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}
