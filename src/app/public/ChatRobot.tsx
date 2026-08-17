import { useEffect, useState } from "react";

export type ChatRobotMood = "idle" | "asking" | "thinking";

export function ChatRobot({
  mood = "idle",
  size = 40,
  label,
}: {
  mood?: ChatRobotMood;
  size?: number;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0 select-none" aria-hidden="true">
      <svg
        className={`chat-robot chat-robot--${mood}`}
        width={size}
        height={Math.round(size * 1.22)}
        viewBox="0 0 80 98"
        fill="none"
      >
        <ellipse className="chat-robot-shadow" cx="40" cy="93" rx="16" ry="3.2" fill="#0f766e" />
        <g className="chat-robot-figure">
          <g className="chat-robot-antenna">
            <path d="M40 18 V6" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
            <circle className="chat-robot-bulb" cx="40" cy="5" r="4.2" fill="#5eead4" />
          </g>
          <rect x="8" y="30" width="8" height="14" rx="4" fill="#0d9488" />
          <rect x="64" y="30" width="8" height="14" rx="4" fill="#0d9488" />
          <rect x="14" y="18" width="52" height="42" rx="16" fill="#14b8a6" />
          <rect x="20" y="28" width="40" height="18" rx="9" fill="#042f2e" />
          <g className="chat-robot-eyes">
            <circle className="chat-robot-eye" cx="32" cy="37" r="3.4" fill="#5eead4" />
            <circle className="chat-robot-eye" cx="48" cy="37" r="3.4" fill="#5eead4" />
          </g>
          <rect className="chat-robot-mouth" x="33" y="50.5" width="14" height="4.5" rx="2.25" fill="#0f766e" />
          <rect className="chat-robot-arm-l" x="10" y="64" width="10" height="16" rx="5" fill="#14b8a6" />
          <rect className="chat-robot-arm-r" x="60" y="64" width="10" height="16" rx="5" fill="#14b8a6" />
          <rect x="22" y="61" width="36" height="24" rx="11" fill="#0d9488" />
          <circle className="chat-robot-heart" cx="40" cy="73" r="4.4" fill="#99f6e4" />
        </g>
      </svg>
      {label && <span className="text-[9px] font-semibold text-teal-700 leading-none">{label}</span>}
    </div>
  );
}

export function ChatRobotTyping() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <ChatRobot mood="thinking" size={40} label="Angelina" />
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <span className="chat-robot-dots" aria-label="Angelina is typing">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

export function AgentSpokenText({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  const [shown, setShown] = useState(animate ? "" : text);

  useEffect(() => {
    if (!animate) {
      setShown(text);
      return;
    }
    setShown("");
    if (!text) return;
    const step = Math.max(8, Math.min(28, Math.floor(1600 / Math.max(text.length, 1))));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, step);
    return () => window.clearInterval(id);
  }, [text, animate]);

  const typing = animate && shown.length < text.length;
  return (
    <>
      {shown}
      {typing && <span className="chat-robot-caret" />}
    </>
  );
}
