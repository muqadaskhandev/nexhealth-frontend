import { useEffect, useState } from "react";

/** MM / DD / YYYY segmented date input matching the NexHealth patient forms verify screen. */
export function DobInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
}) {
  const [mm, setMm] = useState("");
  const [dd, setDd] = useState("");
  const [yyyy, setYyyy] = useState("");

  useEffect(() => {
    if (!value) {
      setMm("");
      setDd("");
      setYyyy("");
      return;
    }
    const [y, m, d] = value.split("-");
    if (y && m && d) {
      setYyyy(y);
      setMm(m);
      setDd(d);
    }
  }, [value]);

  function emit(nextMm: string, nextDd: string, nextYyyy: string) {
    if (nextMm.length === 2 && nextDd.length === 2 && nextYyyy.length === 4) {
      const month = Number(nextMm);
      const day = Number(nextDd);
      const year = Number(nextYyyy);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
        onChange(`${nextYyyy}-${nextMm.padStart(2, "0")}-${nextDd.padStart(2, "0")}`);
        return;
      }
    }
    onChange("");
  }

  const boxCls =
    "w-full px-2 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 text-center outline-none focus:border-teal-400 disabled:bg-gray-50 disabled:text-gray-400";

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="MM"
        value={mm}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setMm(v);
          emit(v, dd, yyyy);
        }}
        className={boxCls}
        aria-label="Month"
      />
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="DD"
        value={dd}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setDd(v);
          emit(mm, v, yyyy);
        }}
        className={boxCls}
        aria-label="Day"
      />
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="YYYY"
        value={yyyy}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          setYyyy(v);
          emit(mm, dd, v);
        }}
        className={`${boxCls} flex-[1.4]`}
        aria-label="Year"
      />
    </div>
  );
}
