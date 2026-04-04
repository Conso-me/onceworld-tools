/**
 * 数値を読みやすい形式にフォーマットする
 * - ja: 万 / 億 / 兆 表記 (例: 1.5万, 3.2億, 1.0兆)
 * - en: K / M / B / T 表記 (例: 100K, 100M, 1B, 1T)
 */
export function formatHitCount(n: number, lang: string): string {
  if (!isFinite(n)) return "∞";
  if (lang === "ja") {
    if (n >= 10_000_000_000_000) return `${Math.floor(n / 1_000_000_000_000).toLocaleString()}兆`;
    if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}兆`;
    if (n >= 1_000_000_000) return `${Math.floor(n / 100_000_000).toLocaleString()}億`;
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
    if (n >= 100_000) return `${Math.floor(n / 10_000).toLocaleString()}万`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  } else {
    if (n >= 1_000_000_000_000) return `${Math.floor(n / 1_000_000_000_000).toLocaleString()}T`;
    if (n >= 1_000_000_000) return `${Math.floor(n / 1_000_000_000).toLocaleString()}B`;
    if (n >= 1_000_000) return `${Math.floor(n / 1_000_000).toLocaleString()}M`;
    if (n >= 10_000) return `${Math.floor(n / 1_000).toLocaleString()}K`;
  }
  return n.toLocaleString();
}
