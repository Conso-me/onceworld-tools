/**
 * 攻撃方法別バフ（複数画面で共有する入力値）
 *
 * 物理:
 *  - devilEye      ゴッドオブデビルアイ → クリティカル倍率 2.5×(1+n×0.003)
 *  - toughouCube   闘晶立方体           → 防御計算前倍率 1+n×0.01（魔晶立方体と同じ）
 * 魔法:
 *  - analysisBook         魔法解析書         → 魔法INT加算
 *  - analysisAnalysisBook 解析書の解析書     → 解析書×(1+n×0.1)
 *  - crystalCube          魔晶立方体         → 防御計算前倍率 1+n×0.01
 *
 * 値は InputField に合わせて文字列で保持する。
 */
export interface AttackBuffs extends Record<string, string> {
  analysisBook: string;
  analysisAnalysisBook: string;
  crystalCube: string;
  toughouCube: string;
  devilEye: string;
}

export const DEFAULT_ATTACK_BUFFS: AttackBuffs = {
  analysisBook: "",
  analysisAnalysisBook: "",
  crystalCube: "",
  toughouCube: "",
  devilEye: "",
};

export interface DerivedAttackBuffs {
  /** 解析書による魔法INT加算（解析書の解析書込み） */
  magicBaseInt: number;
  /** 魔晶立方体: 防御計算前に掛ける倍率 */
  crystalCubePreMult: number;
  /** 魔晶立方体: 最終倍率（常に1。防御前モード確定済み） */
  crystalCubeFinalMult: number;
  /** 闘晶立方体: 防御計算前に掛ける倍率（魔晶立方体と同じ） */
  toughouCubePreMult: number;
  /** ゴッドオブデビルアイ: クリティカル倍率 */
  devilEyeCritMult: number;
}

export function deriveAttackBuffs(b: AttackBuffs): DerivedAttackBuffs {
  const analysisBookNum = parseInt(b.analysisBook) || 0;
  const analysisAnalysisBookNum = parseInt(b.analysisAnalysisBook) || 0;
  const crystalCubeNum = Math.min(parseInt(b.crystalCube) || 0, 1000);
  const toughouCubeNum = Math.min(parseInt(b.toughouCube) || 0, 1000);
  const devilEyeNum = Math.min(parseInt(b.devilEye) || 0, 1000);

  return {
    magicBaseInt: analysisBookNum * (1 + analysisAnalysisBookNum * 0.1),
    crystalCubePreMult: 1 + crystalCubeNum * 0.01,
    crystalCubeFinalMult: 1,
    toughouCubePreMult: 1 + toughouCubeNum * 0.01,
    devilEyeCritMult: 2.5 * (1 + devilEyeNum * 0.003),
  };
}
