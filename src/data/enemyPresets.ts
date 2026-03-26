export interface EnemyPreset {
  monsterName: string | null; // null = 名称不明
  level: number;
  location: string;
}

export interface EnemyPresetGroup {
  mapLabel: string;  // マップ名
  label: string;
  presets: EnemyPreset[];
}

export const enemyPresetGroups: EnemyPresetGroup[] = [
  {
    mapLabel: "深淵回廊",
    label: "16-20F",
    presets: [
      { monsterName: "捧げし者", level: 13333, location: "16層" },
      { monsterName: "イグニス・シスター", level: 7000, location: "17層" },
      { monsterName: "不思議なツボ", level: 45000, location: "17層" },
      { monsterName: "オルド・クラウセス", level: 12000, location: "18層" },
      { monsterName: "BOX", level: 33000, location: "18層" },
      { monsterName: "時空竜クロノゼリウス", level: 39999, location: "19層" },
      { monsterName: "鉄罠花", level: 9, location: "19層" },
      { monsterName: "キングニワトリ", level: 66000, location: "20層" },
      { monsterName: "BOX", level: 50000, location: "20層" },
      { monsterName: "朽ちざる竜骸イゾ", level: 49000, location: "20層" },
      { monsterName: "罪環の監視者モルモ", level: 88888, location: "20層" },
    ],
  },
  {
    mapLabel: "深淵回廊",
    label: "21-25F",
    presets: [
      { monsterName: "罪環の監視者モルモ", level: 44444, location: "21層・入口付近" },
      { monsterName: "イグニス・シスター", level: 35000, location: "21層・中央に複数" },
      { monsterName: "罪環の監視者モルモ", level: 77777, location: "21層・出口付近" },
      { monsterName: "オルド・クラウセス", level: 88888, location: "22層・中央に複数" },
      { monsterName: "罪環の監視者モルモ", level: 66666, location: "22層・入口付近" },
      { monsterName: "罪環の監視者モルモ", level: 99999, location: "22層・出口付近" },
      { monsterName: "冥王ノクタール", level: 99999, location: "23層・中央に複数" },
      { monsterName: "罪環の監視者モルモ", level: 111111, location: "23層・入口付近" },
      { monsterName: "罪環の監視者モルモ", level: 133333, location: "23層・出口付近" },
      { monsterName: "罪環の監視者モルモ", level: 122222, location: "24層・入口付近" },
      { monsterName: "ダークウィッチ", level: 175000, location: "24層・出口付近" },
      { monsterName: "罪環の監視者モルモ", level: 255, location: "24層・中央に複数" },
      { monsterName: "ダークウィッチ", level: 166666, location: "25層・入口付近" },
      { monsterName: "罪環の監視者モルモ", level: 199999, location: "25層・中央に複数" },
      { monsterName: "冥炎のハデス", level: 250000, location: "25層" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ山",
    presets: [
      { monsterName: "オルトロス", level: 661, location: "アイスリッジ山" },
      { monsterName: "オルトロス", level: 700, location: "アイスリッジ山" },
      { monsterName: "雪だるまん", level: 1999, location: "アイスリッジ山" },
      { monsterName: "カニクラブ", level: 480, location: "アイスリッジ山" },
      { monsterName: "カニクラブ", level: 740, location: "アイスリッジ山" },
      { monsterName: "ワニゲーター", level: 740, location: "アイスリッジ山" },
      { monsterName: "ワニゲーター", level: 2200, location: "アイスリッジ山" },
      { monsterName: "マッドシャーク", level: 2200, location: "アイスリッジ山" },
      { monsterName: "ラッキーヒトデ", level: 100, location: "アイスリッジ山・レアモンスター" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ山2",
    presets: [
      { monsterName: "オルトロス", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "シカファイター", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "雪だるまん", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "ペンギンロード", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "カニクラブ", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "ワニゲーター", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "マッドシャーク", level: 2460, location: "アイスリッジ山2" },
      { monsterName: "零の者", level: 5600, location: "アイスリッジ山2" },
      { monsterName: "翡翠竜", level: 4040, location: "アイスリッジ山2" },
      { monsterName: "アビスマーダー", level: 10000, location: "アイスリッジ山2" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ洞窟",
    presets: [
      { monsterName: "オルトロス", level: 2741, location: "アイスリッジ洞窟" },
      { monsterName: "スノーモケラ", level: 2741, location: "アイスリッジ洞窟" },
      { monsterName: "カニクラブ", level: 3555, location: "アイスリッジ洞窟" },
      { monsterName: "ワニゲーター", level: 3740, location: "アイスリッジ洞窟" },
      { monsterName: "翡翠竜", level: 3740, location: "アイスリッジ洞窟" },
      { monsterName: "浮遊イカ", level: 3555, location: "アイスリッジ洞窟" },
      { monsterName: "浮遊イカ", level: 4000, location: "アイスリッジ洞窟" },
      { monsterName: "雪だるまん", level: 4000, location: "アイスリッジ洞窟" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ集落",
    presets: [
      { monsterName: "マッドシャーク", level: 5700, location: "アイスリッジ集落" },
      { monsterName: "命を刈り取る者", level: 6300, location: "アイスリッジ集落" },
      { monsterName: "命を刈り取る者", level: 6850, location: "アイスリッジ集落" },
      { monsterName: "ワニゲーター", level: 6850, location: "アイスリッジ集落" },
      { monsterName: "翡翠竜", level: 6850, location: "アイスリッジ集落" },
      { monsterName: "ヤマタノオロチ", level: 8900, location: "アイスリッジ集落" },
      { monsterName: "氷女王アナトユ", level: 17000, location: "アイスリッジ集落" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ峠",
    presets: [
      { monsterName: "原始蝶", level: 33, location: "アイスリッジ峠" },
      { monsterName: "BOX", level: 17000, location: "アイスリッジ峠" },
      { monsterName: "零の者", level: 20000, location: "アイスリッジ峠" },
      { monsterName: "封印されし神鯨", level: 26000, location: "アイスリッジ峠" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ崖",
    presets: [
      { monsterName: "支配のトリ", level: 23000, location: "アイスリッジ崖" },
      { monsterName: "元ギルド長ノック", level: 39000, location: "アイスリッジ崖" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    label: "アイスリッジ氷葬",
    presets: [
      { monsterName: "翡翠竜", level: 99999, location: "アイスリッジ氷葬" },
      { monsterName: "ブタ天使", level: 165000, location: "アイスリッジ氷葬" },
      { monsterName: "氷結晶", level: 165000, location: "アイスリッジ氷葬" },
      { monsterName: "超越者リガミア", level: 222222, location: "アイスリッジ氷葬" },
    ],
  },
];

export function formatPresetLabel(preset: EnemyPreset): string {
  const name = preset.monsterName ?? "(名称不明)";
  return `${name} (Lv${preset.level.toLocaleString()}) [${preset.location}]`;
}
