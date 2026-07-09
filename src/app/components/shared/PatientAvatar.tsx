export function PatientAvatar({ initials, color, size = "md" }: { initials: string; color?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "xl" ? "w-14 h-14 text-base" : size === "lg" ? "w-12 h-12 text-sm" : size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0`} style={{ backgroundColor: color ?? "#6b7280" }}>
      {initials}
    </div>
  );
}
