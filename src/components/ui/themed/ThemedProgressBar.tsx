/**
 * トークン駆動の細プログレスバー (高さ6px, 塗り = accent)。
 * 既存の色プロップ版 ProgressBar とは別物 (用途が異なるため分離)。
 */
export function ThemedProgressBar({
  value,
  max,
  className = "",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className={`h-1.5 bg-field border border-line rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-accent rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
