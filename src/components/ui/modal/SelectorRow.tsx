import type { ReactNode } from "react";

/**
 * 選択モーダル右ペインのリスト行。選択中スタイル・バッジ・サマリーを統一する。
 * `children` は選択中のみ表示するインライン展開 (ペットのLvラジオ等) 用スロット。
 */
interface SelectorRowProps {
  selected?: boolean;
  onClick: () => void;
  /** 名前 (左寄せ・truncate) */
  primary: ReactNode;
  /** ステータス要約等 (右端・muted) */
  secondary?: ReactNode;
  /** P2 / 魔免 等のバッジ (primary と secondary の間) */
  badge?: ReactNode;
  children?: ReactNode;
}

export function SelectorRow({
  selected = false,
  onClick,
  primary,
  secondary,
  badge,
  children,
}: SelectorRowProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors border-l-2 border-b border-b-line/60 ${
          selected
            ? "bg-accent-soft text-accent font-medium border-l-accent"
            : "text-ink hover:bg-ink/5 border-l-transparent"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? "bg-accent" : "bg-line"}`} />
        <span className="flex-1 text-left text-xs truncate">{primary}</span>
        {badge}
        {secondary != null && <span className="text-xs text-muted shrink-0">{secondary}</span>}
      </button>
      {selected && children}
    </div>
  );
}
