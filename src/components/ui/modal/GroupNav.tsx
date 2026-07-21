import type { ReactNode } from "react";

/**
 * 選択モーダル左ペインのグループメニュー。
 * PC(sm以上): 縦サイドバー / モバイル: 折り返しピルを1部品で自動切替する。
 * ModalBody (flex-col sm:flex-row) の直下に置くこと。2階層グループは2本並べる。
 */
export interface GroupNavItem {
  id: string;
  label: ReactNode;
  /** PC縦サイドバー選択中の文字色上書き (default: text-accent) */
  activeTextClassName?: string;
  /** モバイルピル選択中スタイル上書き (default: bg-accent text-accent-ink) */
  activePillClassName?: string;
}

interface GroupNavProps {
  items: GroupNavItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** PC サイドバーの幅: sm = w-28 / md = w-40 */
  width?: "sm" | "md";
}

export function GroupNav({ items, selectedId, onSelect, width = "sm" }: GroupNavProps) {
  return (
    <>
      {/* Mobile: 折り返しピル */}
      <div className="sm:hidden flex flex-wrap content-start max-h-28 overflow-y-auto overflow-x-hidden gap-1.5 px-4 py-2 border-b border-line bg-bg flex-shrink-0">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedId === item.id
                ? item.activePillClassName ?? "bg-accent text-accent-ink"
                : "bg-card text-ink border border-line"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* PC: 縦サイドバー */}
      <div
        className={`hidden sm:flex flex-col ${width === "md" ? "w-40" : "w-28"} flex-shrink-0 bg-bg border-r border-line overflow-y-auto py-2`}
        style={{ scrollbarGutter: "stable" }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${
              selectedId === item.id
                ? `bg-card border-r-2 border-accent shadow-sm ${item.activeTextClassName ?? "text-accent"}`
                : "text-ink hover:bg-ink/5"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
