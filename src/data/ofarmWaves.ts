/**
 * おふぁ～む（Ofarm）の出現Wave定義
 *
 * 10秒ごとにWaveが切り替わり、各Waveのモンスターを倒しきれないと（または被弾でHP0になると）死亡。
 * monsterName は docs/data/monsters.json のエントリ名と一致させる（scaleMonster でLv補正）。
 * count が null のものはゲーム内で出現数が不明（wiki未記載）。
 */

export interface OfarmWave {
  /** Wave番号（1〜21） */
  wave: number;
  /** モンスター名（monsters.json と一致） */
  monsterName: string;
  /** 出現レベル */
  level: number;
  /** 出現数（不明な場合 null） */
  count: number | null;
}

export const OFARM_WAVES: OfarmWave[] = [
  { wave: 1, monsterName: "グリーンスライム", level: 999, count: 10 },
  { wave: 2, monsterName: "鉄罠花", level: 1800, count: 30 },
  { wave: 3, monsterName: "ペンギンソルジャー", level: 3900, count: 1 },
  { wave: 4, monsterName: "ゴブリンメイジ", level: 300, count: 10 },
  { wave: 5, monsterName: "ハネスライム", level: 6666, count: 10 },
  { wave: 6, monsterName: "マッドガエル", level: 25000, count: 10 },
  { wave: 7, monsterName: "ダークメイジ", level: 88000, count: 7 },
  { wave: 8, monsterName: "パンダ", level: 210000, count: 18 },
  { wave: 9, monsterName: "ゴブリン特攻隊", level: 650000, count: 10 },
  { wave: 10, monsterName: "不思議なツボ", level: 3600000, count: 20 },
  { wave: 11, monsterName: "捧げし者", level: 19999999, count: 1 },
  { wave: 12, monsterName: "居住者B", level: 20000000, count: 10 },
  { wave: 13, monsterName: "ネクロプリンセス", level: 28000000, count: null },
  { wave: 14, monsterName: "焼トリ", level: 44444444, count: 10 },
  { wave: 15, monsterName: "ブタ天使", level: 88888888, count: 3 },
  { wave: 16, monsterName: "カニクラブ", level: 100000000, count: null },
  { wave: 17, monsterName: "氷結晶", level: 100000000, count: null },
  { wave: 18, monsterName: "虹ペリカンEXP", level: 100000000, count: 77 },
  { wave: 19, monsterName: "古代魚ザコーン", level: 200000000, count: null },
  { wave: 20, monsterName: "禁域の巨木", level: 300000000, count: null },
  { wave: 21, monsterName: "時空竜クロノゼリウス", level: 500000000, count: null },
];

/** 折りたたみグループ定義 */
export const OFARM_WAVE_GROUPS: { id: string; from: number; to: number }[] = [
  { id: "g1", from: 1, to: 10 },
  { id: "g2", from: 11, to: 20 },
  { id: "g3", from: 21, to: 21 },
];
