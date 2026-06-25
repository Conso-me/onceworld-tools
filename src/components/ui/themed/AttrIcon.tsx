import type { Element } from "./Chip";

/**
 * 属性アイコン (32×32, 属性色背景 + 漢字1文字)。
 * Theme B の 45°回転宝石スタイルは PR2 の CSS (`attr-icon`) で上書きする。
 */
export function AttrIcon({
  element,
  kanji,
  className = "",
}: {
  element: Element;
  kanji: string;
  className?: string;
}) {
  return (
    <span
      className={`attr-icon flex-none w-8 h-8 rounded-[9px] text-white text-[13px] font-bold flex items-center justify-center ${className}`}
      style={{ background: `var(--${element})` }}
    >
      {kanji}
    </span>
  );
}
