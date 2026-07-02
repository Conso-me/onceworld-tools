import type { ReactNode } from "react";

export type Element = "fire" | "water" | "wood" | "light" | "dark";

/**
 * 属性塗りチップ。属性色 (--fire 等) はトークンを直接参照し、
 * 背景・枠には使わずチップ/アイコンのみに限定する (デザインルール)。
 */
export function Chip({
  children,
  element,
  className = "",
}: {
  children: ReactNode;
  /** 指定すると属性色背景。未指定なら accent 背景 */
  element?: Element;
  className?: string;
}) {
  return (
    <span
      className={`ow-chip inline-flex items-center text-[11px] font-bold px-[9px] py-0.5 rounded-full text-white whitespace-nowrap ${className}`}
      style={{ background: `var(--${element ?? "accent"})` }}
    >
      {children}
    </span>
  );
}

/** アウトラインチップ (特性・攻撃タイプなど) */
export function ChipOutline({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`ow-chip-outline inline-flex items-center text-[11px] font-medium px-[9px] py-0.5 rounded-full text-muted border border-line whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}
