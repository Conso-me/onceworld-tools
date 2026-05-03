/**
 * 天空回廊 階層スキップシミュ
 *
 * 進行ルール:
 * - 片側殲滅で +1F + N (冒険者像所持数) 進む
 * - 両側殲滅(左→像回収→右)で +2F + 2N - p (床置き p 個分は左で像効果から外れる)
 * - 100F毎にスカイガーディアンが出現、討伐で +99F 進む
 * - 冒険者像 N 個: 階層移動時、有効使用数 B (= N - 床置き p) の分追加で進む
 * - 悪魔像 A 個: スカイガーディアン討伐時に +100×A 階層進む
 * - 10000F の倍数はボス階層。スカイガーディアンが出現せず悪魔像スキップ不可。
 *   よって途中で 10000F の倍数に "land" する経路はサイクルが崩れて無効。
 *   ただし最終目標 (targetFloor) が 10000F の倍数の場合はそこで終わるため OK。
 *
 * 1サイクル進行 (ガーディアン討伐 + 片側殲滅):
 *   delta = (99 + 100A) + (1 + B) = 100 + B + 100A
 *   ※ サイクル後の到達位置が 100F の倍数になるよう delta は 100 の倍数必須
 *     → B % 100 === 0
 *
 * 1F→S F (S は 100 の倍数、ボス階層 = 10000 倍数を除く) へ初動 → S F→targetFloor をサイクル化:
 *   - (targetFloor - S) % delta === 0
 *   - k=1..K-1 のいずれの中間位置 S+k*delta も 10000 の倍数でないこと
 */

const BOSS_PERIOD = 10000;

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
 *
 * frontier は floor で重複排除（同じ floor に到達する複数経路は最小床置きのみ保持）
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

  let frontier = new Map<number, FrontierState>();
  frontier.set(1, { floor: 1, steps: [] });

  for (let depth = 0; depth < maxDepth; depth++) {
    const found: InitialPlan[] = [];
    const next = new Map<number, FrontierState>();
    for (const st of frontier.values()) {
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
        } else if (to1 < startFloor && !next.has(to1)) {
          next.set(to1, { floor: to1, steps: [...st.steps, step1] });
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
        } else if (to2 < startFloor && !next.has(to2)) {
          next.set(to2, { floor: to2, steps: [...st.steps, step2] });
        }
      }
    }
    if (found.length > 0) {
      // 最小ステップ数の中から床置き数の少ない順に並べて先頭を返す
      found.sort((a, b) => sumPlaced(a) - sumPlaced(b));
      return [found[0]];
    }
    frontier = next;
    if (frontier.size === 0) break;
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

  // (S, A, B) 単位で最小サイクル数を保持
  const best = new Map<string, CycleSolution>();

  // 冒険者像・悪魔像は入力値を上限として、倉庫から好きな数だけ持ち出して挑戦できる
  // → サイクル中の有効使用数 B (= 持参数) を 100 の倍数で 0..N まで全列挙
  // 床置きは初動 (1F→S) のみで使用、サイクル中は床置きしない (placed=0)
  const maxBrought = Math.floor(N / 100) * 100;

  for (let brought = maxBrought; brought >= 0; brought -= 100) {
    const initialCap = Math.min(placeLimit, brought);

    for (let S = 100; S <= targetFloor; S += 100) {
      // S 自体がボス階層なら、最終目標と一致する場合のみ許容
      if (S % BOSS_PERIOD === 0 && S !== targetFloor) continue;

      const initialPlans = findInitialPlans(brought, S, initialCap);
      if (initialPlans.length === 0) continue;
      const initial = initialPlans[0];
      const remaining = targetFloor - S;

      if (remaining === 0) {
        const key = `${S}-0-${brought}`;
        if (!best.has(key)) {
          best.set(key, {
            startFloor: S,
            demonUsed: 0,
            cycles: 0,
            cycleProgress: 0,
            placedDuringCycle: 0,
            effectiveAdventurer: brought,
            totalOperations: initial.steps.length,
            initial,
          });
        }
        continue;
      }

      for (let A = 0; A <= M; A++) {
        const delta = 100 + brought + 100 * A;
        if (delta <= 0) continue;
        if (remaining % delta !== 0) continue;
        const cycles = remaining / delta;
        if (cycles < 1) continue;

        // ボス階層 (10000F の倍数) を中間で踏むパスは無効
        if (hasMidRouteBoss(S, delta, cycles)) continue;

        const key = `${S}-${A}-${brought}`;
        const existing = best.get(key);
        if (!existing || cycles < existing.cycles) {
          best.set(key, {
            startFloor: S,
            demonUsed: A,
            cycles,
            cycleProgress: delta,
            placedDuringCycle: 0,
            effectiveAdventurer: brought,
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

/**
 * 中間サイクル (k=1..K-1) で 10000F の倍数に着地するかを判定
 * S, delta, cycles はいずれも整数。delta は 100 の倍数前提。
 */
function hasMidRouteBoss(
  startFloor: number,
  delta: number,
  cycles: number,
  bossPeriod: number = BOSS_PERIOD
): boolean {
  if (cycles <= 1) return false;
  // 線形合同方程式 k*delta ≡ -S (mod bossPeriod) を解く
  const target = ((-startFloor % bossPeriod) + bossPeriod) % bossPeriod;
  const g = gcd(delta % bossPeriod, bossPeriod);
  if (target % g !== 0) return false; // 解なし → 中間にボスなし
  const m = bossPeriod / g;
  const a = (delta / g) % m;
  const b = (target / g) % m;
  const aInv = modInverse(a, m);
  if (aInv === null) return false;
  let kStar = (b * aInv) % m;
  if (kStar <= 0) kStar += m;
  // 解は kStar, kStar+m, kStar+2m, ... のいずれか。最小の kStar が cycles-1 以下なら BOSS 中間踏み
  return kStar >= 1 && kStar <= cycles - 1;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

function modInverse(a: number, m: number): number | null {
  if (m === 1) return 0;
  let [oldR, r] = [a, m];
  let [oldS, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1) return null;
  return ((oldS % m) + m) % m;
}
