import type { ReactNode } from "react";

/**
 * テーマトークン駆動のカード。
 * `themed-card` クラスは Theme B の二重額縁 CSS のフック (PR2 で有効化)。
 */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`themed-card bg-card border border-line rounded-card ${className}`}
    >
      {children}
    </div>
  );
}

/** カード見出し行: ステップ番号バッジ + タイトル + 右アクション */
export function CardHeader({
  step,
  title,
  action,
}: {
  step?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-[13px] border-b border-line">
      {step != null && <StepBadge>{step}</StepBadge>}
      <div className="font-heading text-[13px] font-bold text-ink tracking-[var(--head-ls)]">
        {title}
      </div>
      {action != null && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** ステップ番号バッジ (Theme A: 円 / Theme B: 回転ダイヤは PR2 の CSS で上書き) */
export function StepBadge({ children }: { children: ReactNode }) {
  return (
    <span className="step-badge flex-none w-5 h-5 rounded-full bg-ink text-card text-[11px] font-bold flex items-center justify-center">
      {children}
    </span>
  );
}
