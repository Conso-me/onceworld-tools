import { useEffect, useRef, useState } from "react";

// ── SmallNumInput（インライン数値入力・空文字許容） ────────────────────────────

export function SmallNumInput({
  value, onChange, min = 0, max, disabled, className,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; disabled?: boolean; className: string;
}) {
  const [localValue, setLocalValue] = useState(value.toLocaleString());
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocalValue(value.toLocaleString());
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      disabled={disabled}
      onFocus={() => { focused.current = true; setLocalValue(String(value)); }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setLocalValue(raw);
        if (raw !== "") {
          const v = Number(raw);
          onChange(max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v));
        }
      }}
      onBlur={() => {
        focused.current = false;
        const raw = localValue.replace(/[^0-9]/g, "");
        const v = raw === "" ? min : Number(raw);
        const clamped = max !== undefined ? Math.max(min, Math.min(max, v)) : Math.max(min, v);
        onChange(clamped);
        setLocalValue(clamped.toLocaleString());
      }}
      className={className}
    />
  );
}
