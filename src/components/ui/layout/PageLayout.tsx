import type { ReactNode } from "react";

/**
 * サイト標準の2カラムページ骨格。
 * モバイル: max-w-lg 中央寄せの縦積み / PC(lg): 入力左・結果右のグリッド。
 * `grid-cols-[minmax(` の直書きは禁止 — 必ずこのコンポーネントを経由する。
 */
export type LeftWidth = "standard" | "wide" | "narrow";

const VARIANT_CLASSES: Record<LeftWidth, string> = {
  // サイト標準 (DamageCalculator 由来)
  standard:
    "max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start",
  // 左パネルの入力が多いタブ用 (FarmCalculator)
  wide: "max-w-lg mx-auto space-y-6 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(360px,420px)_1fr] lg:gap-2 lg:items-start",
  // タブ内サブ画面用 (Optimizer 系)
  narrow:
    "max-w-lg mx-auto space-y-4 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-4 lg:items-start",
};

interface PageLayoutProps {
  /** 入力パネル群 (モバイルでは上) */
  left: ReactNode;
  /** 結果パネル群 (モバイルでは下) */
  right: ReactNode;
  leftWidth?: LeftWidth;
  className?: string;
}

export function PageLayout({
  left,
  right,
  leftWidth = "standard",
  className = "",
}: PageLayoutProps) {
  return (
    <div className={`${VARIANT_CLASSES[leftWidth]} ${className}`.trim()}>
      {left}
      {right}
    </div>
  );
}
