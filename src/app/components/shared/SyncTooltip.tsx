import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloudOff } from "lucide-react";

const TOOLTIP_WIDTH = 256;

export function SyncTooltip() {
  const [pos, setPos] = useState<{ top: number; left: number; flip: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const flip = rect.top < 80; // not enough room above — show below instead
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, 8),
      window.innerWidth - TOOLTIP_WIDTH - 8
    );
    setPos({ top: flip ? rect.bottom + 8 : rect.top - 8, left, flip });
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Sync status"
      >
        <CloudOff size={15} />
      </button>
      {pos &&
        createPortal(
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none"
            style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH, transform: pos.flip ? undefined : "translateY(-100%)" }}
          >
            This patient was created in NexHealth and is not synced to your health record system
          </div>,
          document.body
        )}
    </div>
  );
}
