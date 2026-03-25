import { useRef, useState, useLayoutEffect } from "react";

export function InputField({
  label,
  value,
  onChange,
  placeholder = "0",
  className = "",
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  max?: number;
}) {
  const [focused, setFocused] = useState(false);
  const num = parseInt(value || "", 10);
  const formatted = isNaN(num) ? "" : num.toLocaleString();

  // フォーカス中はコンマなし（カーソル追跡不要）、フォーカス外はコンマ付き
  const display = focused ? (value || "") : formatted;

  const inputRef = useRef<HTMLInputElement>(null);
  // フォーカス時にコンマ付き→素の数字へ切り替わる際のカーソル位置
  const focusCursorRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (focusCursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(focusCursorRef.current, focusCursorRef.current);
      focusCursorRef.current = null;
    }
  });

  return (
    <div className={`space-y-1.5 lg:space-y-1 ${className}`}>
      <label className="block text-sm lg:text-xs font-medium text-gray-600">{label}</label>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onFocus={(e) => {
          // コンマ付き文字列でのカーソル位置を、素の数字文字列の位置に変換
          const sel = e.target.selectionStart ?? 0;
          focusCursorRef.current = formatted.slice(0, sel).replace(/[^0-9]/g, "").length;
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          if (max !== undefined && raw !== "" && parseInt(raw, 10) > max) return;
          onChange(raw);
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 lg:py-2 bg-white border border-gray-200 rounded-xl text-lg lg:text-base font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
      />
    </div>
  );
}
