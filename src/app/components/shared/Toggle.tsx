export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`inline-flex items-center w-10 h-6 px-1 rounded-full flex-shrink-0 transition-colors ${on ? "bg-teal-500" : "bg-gray-300"}`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}
