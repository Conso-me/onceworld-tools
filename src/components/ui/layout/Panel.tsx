import type { ReactNode } from "react";
import { Card, CardHeader } from "../themed";

/**
 * ページ用カードの標準外枠。装飾はトークン (bg-card / border-line / rounded-card)。
 * rounded-3xl / shadow-lg 系の直書きは禁止 — 必ずこのコンポーネントを経由する。
 */
interface PanelProps {
  /** 見出し。省略時はヘッダー行なし */
  title?: ReactNode;
  /** CardHeader のステップ番号バッジ */
  step?: ReactNode;
  /** ヘッダー右端のアクション (リセットボタン等) */
  action?: ReactNode;
  /** none はリスト直置き用 */
  padding?: "normal" | "none";
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  step,
  action,
  padding = "normal",
  className = "",
  children,
}: PanelProps) {
  return (
    <Card className={`shadow-sm overflow-hidden ${className}`.trim()}>
      {title != null && <CardHeader step={step} title={title} action={action} />}
      <div className={padding === "normal" ? "p-4 sm:p-5" : ""}>{children}</div>
    </Card>
  );
}
