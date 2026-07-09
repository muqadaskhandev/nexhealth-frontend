import { useState } from "react";
import { CloudOff } from "lucide-react";

export function SyncTooltip() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors" aria-label="Sync status">
        <CloudOff size={15} />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-50 leading-relaxed pointer-events-none">
          This patient was created in NexHealth and is not synced to your health record system
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
