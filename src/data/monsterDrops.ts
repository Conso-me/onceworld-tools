/**
 * モンスタードロップ情報
 *
 * ドロップアイテム名: docs/wiki/json/モンスター.json より
 * 基礎固有ドロップ率: ゲーム内情報より
 *   ノーマルドロップ = 固有ドロップ率, レア = /10, 激レア = /100
 *   ゴールドは別枠(30%固定)でドロップ率ボーナス対象外
 */

import wikiData from "../../docs/wiki/json/モンスター.json";

export interface MonsterDropInfo {
  normalDrop: string;
  rareDrop: string;
  superRareDrop: string;
  baseDropRate: number; // 基礎固有ドロップ率 (0–100)
}

// ---- 特殊なドロップ率を持つモンスター ----
// デフォルトは 50%（インフェルニア火山までのほとんどのモンスター）
const DROP_RATE_OVERRIDES: Record<string, number> = {
  // 100% ── ルーン石板をレアドロップするボス
  "ボスゴブリン": 100,
  "ギガントオーク": 100,
  "古代魚　ザコーン": 100,
  "ファントムツリー": 100,
  "スノーモケラ": 100,
  "零の者": 100,
  "ランプの精霊": 100,
  "邪黒竜": 100,
  "捧げし者": 100,
  "黎明神トモダチ": 100,
  "キメラキング": 100,
  "ネクロプリンセス": 100,
  "朽ちざる竜骸イゾ": 100,
  "エレファントパラディン": 100,
  "残燃モエコ": 100,
  "イグニス・シスター": 100,
  "オルド・クラウセス": 100,
  // 100% ── ルーン石板をレアドロップするボス（アイスリッジ）
  "アビスマーダー": 100,
  // 100% ── 魔法の解析書をレアドロップするモンスター
  "ホムラウマ": 100,
  "深淵灯魚": 100,
  "うねうね": 100,
  "イージスリエル": 100,
  "デーモンブレイド": 100,
  // 100% ── その他
  "時空竜クロノゼリウス": 100,
  // 33% ── 水域モンスター等
  "氷女王アナトユ": 33,
  "ヤマタノオロチ": 33,
  "カニクラブ": 33,
  "ワニゲーター": 33,
  "マッドシャーク": 33,
  "浮遊イカ": 33,
  // 25%
  "支配のトリ": 25,
  // 10%
  "冥王ノクタール": 10,
  "キングニワトリ": 10,
  "封印されし神鯨": 10,
  "マルコゲトカゲ": 10,
  // 5%
  "BOX": 5,
  "海賊船": 5,
  "翡翠竜": 5,
  "氷結晶": 5,
  "元ギルド長ノック": 5,
  "ラッキーヒトデ": 5,
  "超越者リガミア": 5,
  "白竜": 5,
  "ダークウィッチ": 5,
  "冥炎のハデス": 5,
  // 1%
  "ペリカンEXP": 1,
  "虹ペリカンEXP": 1,
  // 0.1%
  "命を刈り取る者": 0.1,
};

// ---- wiki JSON からマップ構築 ----
// wikiData[0] = ドロップテーブル (headers: モンスター名, 主な出現場所, 通常ドロップ, レアドロップ, 激レアドロップ, 捕獲率)
const rows = (wikiData as unknown as { headers: string[]; rows: string[][] }[])[0].rows;

const dropInfoMap = new Map<string, MonsterDropInfo>();

for (const row of rows) {
  const [name, , normalDrop = "", rareDrop = "", superRareDrop = ""] = row;
  if (!name) continue;
  dropInfoMap.set(name, {
    normalDrop,
    rareDrop,
    superRareDrop,
    baseDropRate: DROP_RATE_OVERRIDES[name] ?? 50,
  });
}

export function getMonsterDropInfo(name: string): MonsterDropInfo | undefined {
  return dropInfoMap.get(name);
}
