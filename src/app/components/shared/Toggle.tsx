export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${on ? "bg-teal-500" : "bg-gray-300"}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}
