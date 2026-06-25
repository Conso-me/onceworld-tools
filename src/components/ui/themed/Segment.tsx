/**
 * ピル/トグル型セグメント。選択中は white(card) 背景 + 微影 (Theme A)。
 * Theme B の塗り (ink 背景) は PR2 の CSS で上書きする。
 */
export function Segment<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`ow-segment flex bg-field border border-line rounded-ctl p-[3px] ${className}`}
    >
      {items.map((it) => {
        const on = value === it;
        return (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            className={
              "ow-segment-item flex-1 text-center text-xs py-1.5 rounded-[6px] transition-colors " +
              (on
                ? "bg-card text-ink font-bold shadow-[0_1px_2px_rgba(31,29,24,0.08)]"
                : "text-muted hover:text-ink")
            }
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}
