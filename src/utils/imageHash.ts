/**
 * dHash (difference hash) — Canvas APIのみで画像領域のperceptual hashを計算する。
 *
 * 9×8にリサイズ → グレースケール → 背景正規化 → 隣接ピクセルの明暗差で64bitハッシュ生成。
 * JPEG圧縮差・解像度差に強く、ハミング距離でO(1)比較が可能。
 *
 * 背景正規化:
 *   図鑑アイコン(暗背景)とアリーナアイコン(白背景)で背景色が異なるため、
 *   外周ピクセルから背景色を推定し、背景をニュートラルグレー(128)に統一する。
 *   これによりスプライト境界でのdHashビット反転を防ぎ、背景色に依存しないハッシュを生成する。
 */

/**
 * 指定領域のdHashを計算する。
 *
 * @param ctx       ソース画像が描画済みの CanvasRenderingContext2D
 * @param x         領域の左上 x
 * @param y         領域の左上 y
 * @param w         領域の幅
 * @param h         領域の高さ
 * @param skipTopLeftRatio  左上を除外する比率（0-1）。「捕獲済み」スタンプ対策用。
 * @returns 64bit dHash (bigint)
 */
export function computeDHashFromRegion(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  { skipTopLeftRatio = 0.25 }: { skipTopLeftRatio?: number } = {},
): bigint {
  // 左上除外: 除外領域を透明にした上でリサイズ
  const skipW = Math.floor(w * skipTopLeftRatio);
  const skipH = Math.floor(h * skipTopLeftRatio);

  // offscreen canvas で 9×8 にリサイズ
  const oc = new OffscreenCanvas(9, 8);
  const octx = oc.getContext("2d")!;

  // ソース領域を 9×8 に描画
  octx.drawImage(
    ctx.canvas instanceof HTMLCanvasElement ? ctx.canvas : ctx.canvas as OffscreenCanvas,
    x, y, w, h,
    0, 0, 9, 8,
  );

  // 左上除外領域をクリア（リサイズ後のピクセル座標に変換）
  let clearW = 0, clearH = 0;
  if (skipTopLeftRatio > 0) {
    clearW = Math.max(1, Math.round((skipW / w) * 9));
    clearH = Math.max(1, Math.round((skipH / h) * 8));
    octx.clearRect(0, 0, clearW, clearH);
  }

  const imageData = octx.getImageData(0, 0, 9, 8);
  const pixels = imageData.data;

  // グレースケール化 (luminance: 0.299R + 0.587G + 0.114B)
  const gray: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a === 0) {
      // 透明ピクセル（除外領域）→ 128 (中間値)
      gray.push(128);
    } else {
      gray.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    }
  }

  // ── 背景正規化 ──────────────────────────────────────────────────────────
  // 外周ピクセル（除外領域を除く）から背景色を推定し、
  // 背景に近いピクセルをニュートラルグレーに置換する。
  const borderGrays: number[] = [];
  for (let c = 0; c < 9; c++) {
    // 上辺（除外領域でないもの）
    if (!(c < clearW && 0 < clearH)) borderGrays.push(gray[c]);
    // 下辺
    borderGrays.push(gray[7 * 9 + c]);
  }
  for (let r = 1; r < 7; r++) {
    // 左辺（除外領域でないもの）
    if (!(0 < clearW && r < clearH)) borderGrays.push(gray[r * 9]);
    // 右辺
    borderGrays.push(gray[r * 9 + 8]);
  }

  if (borderGrays.length > 0) {
    borderGrays.sort((a, b) => a - b);
    const bgGray = borderGrays[Math.floor(borderGrays.length / 2)]; // 中央値
    const NEUTRAL = 128;
    const BG_THRESHOLD = 35;
    for (let i = 0; i < gray.length; i++) {
      if (Math.abs(gray[i] - bgGray) < BG_THRESHOLD) {
        gray[i] = NEUTRAL;
      }
    }
  }

  // dHash: 各行で隣接ピクセルを比較 (8行 × 8比較 = 64bit)
  let hash = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 9 + col;
      if (gray[idx] < gray[idx + 1]) {
        hash |= 1n << BigInt(row * 8 + col);
      }
    }
  }

  return hash;
}

/**
 * 2つのdHash間のハミング距離を計算する。
 * XOR + popcount で O(1)。
 */
export function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

/** bigint hash を16進文字列に変換 */
export function hashToHex(hash: bigint): string {
  return hash.toString(16).padStart(16, "0");
}

/** 16進文字列を bigint hash に変換 */
export function hexToHash(hex: string): bigint {
  return BigInt("0x" + hex);
}
