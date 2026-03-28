/**
 * 数値を読みやすい形式にフォーマットする
 * - ja: 10,000以上は「万」表記 (例: 60万, 1.5万)
 * - en: 10,000以上は「K」表記、1,000,000以上は「M」表記
 */
export function formatHitCount(n: number, lang: string): string {
  if (!isFinite(n)) return "∞";
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000).toLocaleString()}M`;
  if (lang === "ja") {
    if (n >= 100_000) return `${Math.floor(n / 10_000).toLocaleString()}万`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  } else {
    if (n >= 10_000) return `${Math.floor(n / 1_000).toLocaleString()}K`;
  }
  return n.toLocaleString();
}
