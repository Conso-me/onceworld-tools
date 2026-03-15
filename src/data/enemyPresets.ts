export interface EnemyPreset {
  monsterName: string | null; // null = 名称不明
  level: number;
  location: string;
}

export interface EnemyPresetGroup {
  label: string;
  presets: EnemyPreset[];
}

export const enemyPresetGroups: EnemyPresetGroup[] = [
  {
    label: "深淵回廊",
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
];

export function formatPresetLabel(preset: EnemyPreset): string {
  const name = preset.monsterName ?? "(名称不明)";
  return `${name} (Lv${preset.level.toLocaleString()}) [${preset.location}]`;
}
