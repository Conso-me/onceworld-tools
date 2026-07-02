import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * サイト標準のモーダル外枠。`fixed inset-0` の直書きは禁止 — 必ずこれを経由する。
 * portal / ESC / 背景クリック閉じ / z-50 / bg-black/50 / 中央寄せ / body スクロールロックを担う。
 */
type ModalSize = "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  /** タイトル右隣のアクション (複数選択トグル等) */
  headerAction?: ReactNode;
  /** 確定ボタン行等。枠線・背景込みのスロット */
  footer?: ReactNode;
  size?: ModalSize;
  /** fixed: 2ペイン選択系 (高さ固定) / auto: 表示系 (内容に応じて縮む) */
  height?: "fixed" | "auto";
  children: ReactNode;
}

export function ModalShell({
  isOpen,
  onClose,
  title,
  headerAction,
  footer,
  size = "md",
  height = "auto",
  children,
}: ModalShellProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-card rounded-2xl shadow-2xl w-full ${SIZE_CLASSES[size]} flex flex-col overflow-hidden`}
        style={height === "fixed" ? { height: "min(640px, 85vh)" } : { maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base font-bold text-ink truncate">{title}</h3>
            {headerAction}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink transition-colors text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {children}

        {footer ? (
          <div className="flex items-center justify-between px-5 py-3 border-t border-line bg-bg flex-shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/**
 * 2ペイン選択モーダルの本体領域。
 * モバイル: 縦積み (GroupNav はピル行になる) / PC(sm): 左サイドバー + 右リストの横並び。
 */
export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">{children}</div>
  );
}
