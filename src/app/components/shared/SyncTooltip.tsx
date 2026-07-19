import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_WIDTH = 256;

/** Hollow cloud with an X — matches NexHealth unsynced patient indicator. */
function UnsyncedCloudIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Cloud outline */}
      <path
        d="M6.5 19h10.25A4.25 4.25 0 0 0 21 14.75c0-1.9-1.25-3.5-3-4.05A5.25 5.25 0 0 0 7.9 9.4 3.75 3.75 0 0 0 3 13.1c0 .35.05.7.14 1.02A3.5 3.5 0 0 0 6.5 19Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* X */}
      <path
        d="M10 11.25 14 15.25M14 11.25 10 15.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SyncTooltip() {
  const [pos, setPos] = useState<{ top: number; left: number; flip: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const flip = rect.top < 80;
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
        type="button"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onClick={(e) => e.stopPropagation()}
        className="p-0.5 rounded text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Not synced to health record system"
      >
        <UnsyncedCloudIcon size={16} />
      </button>
      {pos &&
        createPortal(
          <div
            className="fixed z-[60] bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-xl leading-relaxed pointer-events-none"
            style={{
              top: pos.top,
              left: pos.left,
              width: TOOLTIP_WIDTH,
              transform: pos.flip ? undefined : "translateY(-100%)",
            }}
          >
            This patient was created in NexHealth and is not synced to your health record system
          </div>,
          document.body
        )}
    </div>
  );
}
