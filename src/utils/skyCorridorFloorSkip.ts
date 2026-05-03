/**
 * 天空回廊 階層スキップシミュ
 *
 * 進行ルール:
 * - 片側殲滅で +1F 進む / 両側殲滅(左→像回収→右)で +2F + 像効果2回分
 * - 100F毎にスカイガーディアンが出現、討伐で +99F 進む
 * - 冒険者像 N 個: 階層移動時、有効使用数 B (= N - 床置き p) の分追加で進む
 * - 悪魔像 A 個: スカイガーディアン討伐時に +100×A 階層進む
 *
 * 1サイクル進行 (片側殲滅 + ガーディアン討伐):
 *   delta = (1 + B) + (99 + 100A) = 100 + B + 100A
 *
 * 1F→S F (S は 100 の倍数) へ初動 → S F→targetFloor をサイクル化:
 *   (targetFloor - S) % delta === 0 となる (S, A, p) を列挙
 */

export interface FloorSkipInput {
  /** 冒険者像所持数 N */
  adventurerStatues: number;
  /** 悪魔像所持数 M（使用上限） */
  demonStatues: number;
  /** 目標フロア（100 の倍数） */
  targetFloor: number;
  /** 床置き上限（冒険者像のみ対象） */
  placeLimit: number;
}

export type AnnihilationSide = "left" | "right" | "both";

export interface InitialStep {
  fromFloor: number;
  toFloor: number;
  /** "left"/"right" は片側殲滅、"both" は左→像回収→右の両側殲滅 */
  side: AnnihilationSide;
  /** このステップ前に床に置いた冒険者像の数 */
  placedBefore: number;
  /** このステップで効果が乗った冒険者像数（両側の場合は左+右の合計） */
  usedStatues: number;
}

export interface InitialPlan {
  startFloor: number;
  steps: InitialStep[];
}

export interface CycleSolution {
  /** スタート階層 S (100の倍数) */
  startFloor: number;
  /** 1サイクルで使う悪魔像数 A */
  demonUsed: number;
  /** サイクル数 K */
  cycles: number;
  /** 1サイクルで進む階層 = 100 + B + 100A */
  cycleProgress: number;
  /** サイクル中の床置き p（B = N - p） */
  placedDuringCycle: number;
  /** サイクル中の冒険者像有効使用数 B */
  effectiveAdventurer: number;
  /** 概算操作数（初動ステップ数 + サイクル数 × 2） */
  totalOperations: number;
  /** 初動 1F→S F の手順 */
  initial: InitialPlan;
}

interface FrontierState {
  floor: number;
  steps: InitialStep[];
}

/**
 * 1F→S F の初動プラン（最小ステップ数の代表 1 案）を BFS で探索
 */
export function findInitialPlans(
  adventurerStatues: number,
  startFloor: number,
  placeLimit: number,
  maxDepth: number = 3
): InitialPlan[] {
  if (startFloor < 1 || startFloor % 100 !== 0) return [];

  const N = adventurerStatues;
  const cap = Math.min(placeLimit, N);

  let frontier: FrontierState[] = [{ floor: 1, steps: [] }];
  for (let depth = 0; depth < maxDepth; depth++) {
    const found: InitialPlan[] = [];
    const next: FrontierState[] = [];
    for (const st of frontier) {
      for (let p = 0; p <= cap; p++) {
        // 片側殲滅: 進む = 1 + (N - p)
        const adv1 = 1 + (N - p);
        const to1 = st.floor + adv1;
        const step1: InitialStep = {
          fromFloor: st.floor,
          toFloor: to1,
          side: "left",
          placedBefore: p,
          usedStatues: N - p,
        };
        if (to1 === startFloor) {
          found.push({ startFloor, steps: [...st.steps, step1] });
        } else if (to1 < startFloor) {
          next.push({ floor: to1, steps: [...st.steps, step1] });
        }

        // 両側殲滅 (左→像回収→右): 進む = (1 + (N - p)) + (1 + N)
        const adv2 = 2 + (N - p) + N;
        const to2 = st.floor + adv2;
        const step2: InitialStep = {
          fromFloor: st.floor,
          toFloor: to2,
          side: "both",
          placedBefore: p,
          usedStatues: 2 * N - p,
        };
        if (to2 === startFloor) {
          found.push({ startFloor, steps: [...st.steps, step2] });
        } else if (to2 < startFloor) {
          next.push({ floor: to2, steps: [...st.steps, step2] });
        }
      }
    }
    if (found.length > 0) {
      // 最小ステップ数の中から床置き数の少ない順に並べて先頭を返す
      found.sort((a, b) => sumPlaced(a) - sumPlaced(b));
      return [found[0]];
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return [];
}

function sumPlaced(plan: InitialPlan): number {
  return plan.steps.reduce((acc, s) => acc + s.placedBefore, 0);
}

/**
 * 入力条件下で「ちょうど目標フロアに到達する」全組合せを列挙
 */
export function enumerateFloorSkip(input: FloorSkipInput): CycleSolution[] {
  const { adventurerStatues: N, demonStatues: M, targetFloor, placeLimit } = input;
  if (!Number.isFinite(N) || !Number.isFinite(M)) return [];
  if (N < 0 || M < 0) return [];
  if (targetFloor < 100 || targetFloor % 100 !== 0) return [];
  if (placeLimit < 0) return [];

  // (S, A) 単位で最小サイクル数を保持
  const best = new Map<string, CycleSolution>();

  for (let S = 100; S <= targetFloor; S += 100) {
    const initialPlans = findInitialPlans(N, S, placeLimit);
    if (initialPlans.length === 0) continue;
    const initial = initialPlans[0];
    const remaining = targetFloor - S;

    if (remaining === 0) {
      best.set(`${S}-0`, {
        startFloor: S,
        demonUsed: 0,
        cycles: 0,
        cycleProgress: 0,
        placedDuringCycle: 0,
        effectiveAdventurer: N,
        totalOperations: initial.steps.length,
        initial,
      });
      continue;
    }

    for (let A = 0; A <= M; A++) {
      for (let p = 0; p <= placeLimit; p++) {
        const B = N - p;
        if (B < 0) continue;
        const delta = 100 + B + 100 * A;
        if (delta <= 0) continue;
        if (remaining % delta !== 0) continue;
        const cycles = remaining / delta;
        if (cycles < 1) continue;

        const key = `${S}-${A}`;
        const existing = best.get(key);
        // 同じ (S, A) ならサイクル数の小さい方 (= delta が大きい = p が小さい) を採用
        if (!existing || cycles < existing.cycles) {
          best.set(key, {
            startFloor: S,
            demonUsed: A,
            cycles,
            cycleProgress: delta,
            placedDuringCycle: p,
            effectiveAdventurer: B,
            totalOperations: initial.steps.length + cycles * 2,
            initial,
          });
        }
      }
    }
  }

  const arr = Array.from(best.values());
  // ソート: 操作数が少ない順 → サイクル数が少ない順 → スタートF が小さい順
  arr.sort(
    (a, b) =>
      a.totalOperations - b.totalOperations ||
      a.cycles - b.cycles ||
      a.startFloor - b.startFloor
  );
  return arr;
}
