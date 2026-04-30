export interface EnemyPreset {
  monsterName: string | null; // null = 名称不明
  level: number;
  location: string;
  locationEn?: string;
  magicImmune?: boolean;
}

export interface EnemyPresetGroup {
  mapLabel: string;  // マップ名
  mapLabelEn?: string;
  label: string;
  labelEn?: string;
  presets: EnemyPreset[];
}

export const enemyPresetGroups: EnemyPresetGroup[] = [
  // ---- 循環宇宙 ----
  {
    mapLabel: "循環宇宙",
    mapLabelEn: "Cyclical Cosmos",
    label: "循環宇宙",
    labelEn: "Cyclical Cosmos",
    presets: [
      { monsterName: "古代魚ザコーン",   level: 999,     location: "循環宇宙・マップ入口左右の部屋", locationEn: "Cyclical Cosmos - Left/Right rooms at entrance" },
      { monsterName: "零の者",           level: 999,     location: "循環宇宙・奥・右下",             locationEn: "Cyclical Cosmos - Back, Lower-Right" },
      { monsterName: "黎明神トモダチ",   level: 999,     location: "循環宇宙・奥・左下",             locationEn: "Cyclical Cosmos - Back, Lower-Left" },
      { monsterName: "朽ちざる竜骸イゾ", level: 999,     location: "循環宇宙・奥・右上",             locationEn: "Cyclical Cosmos - Back, Upper-Right" },
      { monsterName: "残燃モエコ",       level: 999,     location: "循環宇宙・奥・左上",             locationEn: "Cyclical Cosmos - Back, Upper-Left" },
    ],
  },
  {
    mapLabel: "循環宇宙",
    mapLabelEn: "Cyclical Cosmos",
    label: "循環宇宙２",
    labelEn: "Cyclical Cosmos 2",
    presets: [
      { monsterName: "グラビティスライム", level: 118000, location: "循環宇宙２", locationEn: "Cyclical Cosmos 2" },
    ],
  },
  {
    mapLabel: "循環宇宙",
    mapLabelEn: "Cyclical Cosmos",
    label: "循環宇宙３",
    labelEn: "Cyclical Cosmos 3",
    presets: [
      { monsterName: "朽ちざる竜骸イゾ",   level: 75000,  location: "循環宇宙３・左",          locationEn: "Cyclical Cosmos 3 - Left" },
      { monsterName: "グラビティスライム", level: 75000,  location: "循環宇宙３・左",          locationEn: "Cyclical Cosmos 3 - Left" },
      { monsterName: "朽ちざる竜骸イゾ",   level: 95000,  location: "循環宇宙３・左",          locationEn: "Cyclical Cosmos 3 - Left" },
      { monsterName: "グラビティスライム", level: 95000,  location: "循環宇宙３・左",          locationEn: "Cyclical Cosmos 3 - Left" },
      { monsterName: "デーモンブレイド",   level: 245000, location: "循環宇宙３・ボス取り巻き", locationEn: "Cyclical Cosmos 3 - Boss Escorts" },
      { monsterName: "マルコゲトカゲ",     level: 245000, location: "循環宇宙３・ボス取り巻き", locationEn: "Cyclical Cosmos 3 - Boss Escorts" },
      { monsterName: "ダークフェニックス", level: 390000, location: "循環宇宙３・ボス",         locationEn: "Cyclical Cosmos 3 - Boss" },
      { monsterName: "残燃モエコ",         level: 95000,  location: "循環宇宙３・右",          locationEn: "Cyclical Cosmos 3 - Right" },
      { monsterName: "ドラゴンヘッド",     level: 95000,  location: "循環宇宙３・右",          locationEn: "Cyclical Cosmos 3 - Right" },
      { monsterName: "ラッキーヒトデ",     level: 98000,  location: "循環宇宙３・下",          locationEn: "Cyclical Cosmos 3 - South" },
      { monsterName: "動く石碑",           level: 98000,  location: "循環宇宙３・下・レア出現", locationEn: "Cyclical Cosmos 3 - South, Rare Spawn", magicImmune: true },
      { monsterName: "捧げし者",           level: 144444, location: "循環宇宙３・右下",        locationEn: "Cyclical Cosmos 3 - Lower-Right" },
      { monsterName: "黎明神トモダチ",     level: 144444, location: "循環宇宙３・右下",        locationEn: "Cyclical Cosmos 3 - Lower-Right" },
    ],
  },
  {
    mapLabel: "循環宇宙",
    mapLabelEn: "Cyclical Cosmos",
    label: "循環宇宙４",
    labelEn: "Cyclical Cosmos 4",
    presets: [
      { monsterName: "雷大王イカ",       level: 140000, location: "循環宇宙４",          locationEn: "Cyclical Cosmos 4" },
      { monsterName: "グラビティスライム", level: 140000, location: "循環宇宙４",         locationEn: "Cyclical Cosmos 4" },
      { monsterName: "ペリカンEXP",      level: 140000, location: "循環宇宙４",          locationEn: "Cyclical Cosmos 4" },
      { monsterName: "黙示木",           level: 180000, location: "循環宇宙４",          locationEn: "Cyclical Cosmos 4" },
      { monsterName: "オコシイタケ",     level: 180000, location: "循環宇宙４",          locationEn: "Cyclical Cosmos 4" },
      { monsterName: "オコスター",       level: 280000, location: "循環宇宙４",          locationEn: "Cyclical Cosmos 4" },
      { monsterName: "オコォーン",       level: 280000, location: "循環宇宙４・レア出現", locationEn: "Cyclical Cosmos 4 - Rare Spawn" },
      { monsterName: "虹ペリカンEXP",    level: 140000, location: "循環宇宙４・レア出現", locationEn: "Cyclical Cosmos 4 - Rare Spawn" },
    ],
  },
  {
    mapLabel: "循環宇宙",
    mapLabelEn: "Cyclical Cosmos",
    label: "循環宇宙最深部",
    labelEn: "Cyclical Cosmos Depths",
    presets: [
      { monsterName: "雷大王イカ",         level: 310000, location: "循環宇宙最深部・入口付近",    locationEn: "Cyclical Cosmos Depths - Near Entrance" },
      { monsterName: "トリカゴドリ",       level: 365000, location: "循環宇宙最深部・右上",       locationEn: "Cyclical Cosmos Depths - Upper-Right" },
      { monsterName: "黙示木",             level: 390000, location: "循環宇宙最深部・左右の小部屋", locationEn: "Cyclical Cosmos Depths - Side Rooms" },
      { monsterName: "雷大王イカ",         level: 390000, location: "循環宇宙最深部・左右の小部屋", locationEn: "Cyclical Cosmos Depths - Side Rooms" },
      { monsterName: "グラビティスライム", level: 390000, location: "循環宇宙最深部・左右の小部屋", locationEn: "Cyclical Cosmos Depths - Side Rooms" },
      { monsterName: "動く石碑",           level: 310000, location: "循環宇宙最深部・レア出現",   locationEn: "Cyclical Cosmos Depths - Rare Spawn", magicImmune: true },
      { monsterName: "動く石碑",           level: 365000, location: "循環宇宙最深部・レア出現",   locationEn: "Cyclical Cosmos Depths - Rare Spawn", magicImmune: true },
      { monsterName: "動く石碑",           level: 390000, location: "循環宇宙最深部・レア出現",   locationEn: "Cyclical Cosmos Depths - Rare Spawn", magicImmune: true },
      { monsterName: "ドラゴンヘッド",     level: 580000, location: "循環宇宙最深部・ボス部屋",   locationEn: "Cyclical Cosmos Depths - Boss Room" },
      { monsterName: "黙示木",             level: 650000, location: "循環宇宙最深部・ボス部屋",   locationEn: "Cyclical Cosmos Depths - Boss Room" },
      { monsterName: "鉄壁要塞パルテノン", level: 680000, location: "循環宇宙最深部・ボス",       locationEn: "Cyclical Cosmos Depths - Boss" },
    ],
  },
  {
    mapLabel: "循環宇宙",
    mapLabelEn: "Cyclical Cosmos",
    label: "循環宇宙EX",
    labelEn: "Cyclical Cosmos EX",
    presets: [
      { monsterName: "オコスター",          level: 99999,    location: "循環宇宙EX",          locationEn: "Cyclical Cosmos EX" },
      { monsterName: "オコォーン",          level: 99999,    location: "循環宇宙EX・レア出現", locationEn: "Cyclical Cosmos EX - Rare Spawn" },
      { monsterName: "オコォーン",          level: 999999,   location: "循環宇宙EX・ボス部屋", locationEn: "Cyclical Cosmos EX - Boss Room" },
      { monsterName: "オメガ・スペクトラム", level: 2550000, location: "循環宇宙EX・ボス",     locationEn: "Cyclical Cosmos EX - Boss" },
    ],
  },
  // ---- 無限島 ----
  {
    mapLabel: "無限島",
    mapLabelEn: "Infinite Island",
    label: "無限島",
    labelEn: "Infinite Island",
    presets: [
      { monsterName: "深淵灯魚",     level: 110,  location: "無限島・海の中", locationEn: "Infinite Island - In the Sea" },
      { monsterName: "ホムラウマ",   level: 9999, location: "無限島２",       locationEn: "Infinite Island 2" },
      { monsterName: "うねうね",     level: 9999, location: "無限島２",       locationEn: "Infinite Island 2" },
      { monsterName: "イージスリエル", level: 9999, location: "無限島２",     locationEn: "Infinite Island 2" },
    ],
  },
  {
    mapLabel: "無限島",
    mapLabelEn: "Infinite Island",
    label: "無限崖",
    labelEn: "Infinite Cliff",
    presets: [
      { monsterName: "クリーチャーローズ", level: 370000, location: "無限崖", locationEn: "Infinite Cliff" },
      { monsterName: "鉄罠花",             level: 370000, location: "無限崖", locationEn: "Infinite Cliff" },
      { monsterName: "支配のトリ",         level: 370000, location: "無限崖", locationEn: "Infinite Cliff" },
      { monsterName: "ペリカンEXP",        level: 370000, location: "無限崖", locationEn: "Infinite Cliff" },
      { monsterName: "虹ペリカンEXP",      level: 370000, location: "無限崖", locationEn: "Infinite Cliff" },
    ],
  },
  {
    mapLabel: "無限島",
    mapLabelEn: "Infinite Island",
    label: "太古の中庭",
    labelEn: "Ancient Courtyard",
    presets: [
      { monsterName: "オコスター",       level: 350000,   location: "太古の中庭",          locationEn: "Ancient Courtyard" },
      { monsterName: "オコォーン",       level: 350000,   location: "太古の中庭・レア出現", locationEn: "Ancient Courtyard - Rare Spawn" },
      { monsterName: "黙示木",           level: 810000,   location: "太古の中庭",          locationEn: "Ancient Courtyard" },
      { monsterName: "根界獣ドルグラント", level: 1280000, location: "太古の中庭・ボス",    locationEn: "Ancient Courtyard - Boss", magicImmune: true },
    ],
  },
  // ---- 深淵回廊 ----
  {
    mapLabel: "深淵回廊",
    mapLabelEn: "Abyssal Corridor",
    label: "16-20F",
    labelEn: "16-20F",
    presets: [
      { monsterName: "捧げし者",           level: 13333,  location: "16層", locationEn: "Floor 16" },
      { monsterName: "イグニス・シスター", level: 7000,   location: "17層", locationEn: "Floor 17" },
      { monsterName: "不思議なツボ",       level: 45000,  location: "17層", locationEn: "Floor 17" },
      { monsterName: "オルド・クラウセス", level: 12000,  location: "18層", locationEn: "Floor 18" },
      { monsterName: "BOX",               level: 33000,  location: "18層", locationEn: "Floor 18" },
      { monsterName: "時空竜クロノゼリウス", level: 39999, location: "19層", locationEn: "Floor 19" },
      { monsterName: "鉄罠花",             level: 9,      location: "19層", locationEn: "Floor 19" },
      { monsterName: "キングニワトリ",     level: 66000,  location: "20層", locationEn: "Floor 20" },
      { monsterName: "BOX",               level: 50000,  location: "20層", locationEn: "Floor 20" },
      { monsterName: "朽ちざる竜骸イゾ",   level: 49000,  location: "20層", locationEn: "Floor 20" },
      { monsterName: "罪環の監視者モルモ", level: 88888,  location: "20層", locationEn: "Floor 20" },
    ],
  },
  {
    mapLabel: "深淵回廊",
    mapLabelEn: "Abyssal Corridor",
    label: "21-25F",
    labelEn: "21-25F",
    presets: [
      { monsterName: "罪環の監視者モルモ", level: 44444,  location: "21層・入口付近",    locationEn: "Floor 21 - Near Entrance" },
      { monsterName: "イグニス・シスター", level: 35000,  location: "21層・中央に複数",  locationEn: "Floor 21 - Multiple in Center" },
      { monsterName: "罪環の監視者モルモ", level: 77777,  location: "21層・出口付近",    locationEn: "Floor 21 - Near Exit" },
      { monsterName: "オルド・クラウセス", level: 88888,  location: "22層・中央に複数",  locationEn: "Floor 22 - Multiple in Center" },
      { monsterName: "罪環の監視者モルモ", level: 66666,  location: "22層・入口付近",    locationEn: "Floor 22 - Near Entrance" },
      { monsterName: "罪環の監視者モルモ", level: 99999,  location: "22層・出口付近",    locationEn: "Floor 22 - Near Exit" },
      { monsterName: "冥王ノクタール",     level: 99999,  location: "23層・中央に複数",  locationEn: "Floor 23 - Multiple in Center" },
      { monsterName: "罪環の監視者モルモ", level: 111111, location: "23層・入口付近",    locationEn: "Floor 23 - Near Entrance" },
      { monsterName: "罪環の監視者モルモ", level: 133333, location: "23層・出口付近",    locationEn: "Floor 23 - Near Exit" },
      { monsterName: "罪環の監視者モルモ", level: 122222, location: "24層・入口付近",    locationEn: "Floor 24 - Near Entrance" },
      { monsterName: "ダークウィッチ",     level: 175000, location: "24層・出口付近",    locationEn: "Floor 24 - Near Exit" },
      { monsterName: "罪環の監視者モルモ", level: 255,    location: "24層・中央に複数",  locationEn: "Floor 24 - Multiple in Center" },
      { monsterName: "ダークウィッチ",     level: 166666, location: "25層・入口付近",    locationEn: "Floor 25 - Near Entrance" },
      { monsterName: "罪環の監視者モルモ", level: 199999, location: "25層・中央に複数",  locationEn: "Floor 25 - Multiple in Center" },
      { monsterName: "冥炎のハデス",       level: 250000, location: "25層",              locationEn: "Floor 25" },
    ],
  },
  // ---- アイスリッジ山 ----
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ山",
    labelEn: "Ice Ridge Mtn",
    presets: [
      { monsterName: "オルトロス",       level: 661,   location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "オルトロス",       level: 700,   location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "雪だるまん",       level: 1999,  location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "カニクラブ",       level: 480,   location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "カニクラブ",       level: 740,   location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "ワニゲーター",     level: 740,   location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "ワニゲーター",     level: 2200,  location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "マッドシャーク",   level: 2200,  location: "アイスリッジ山",              locationEn: "Ice Ridge Mountain" },
      { monsterName: "ラッキーヒトデ",   level: 100,   location: "アイスリッジ山・レアモンスター", locationEn: "Ice Ridge Mountain - Rare Monster" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ山2",
    labelEn: "Ice Ridge Mtn 2",
    presets: [
      { monsterName: "オルトロス",       level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "シカファイター",   level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "雪だるまん",       level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "ペンギンロード",   level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "カニクラブ",       level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "ワニゲーター",     level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "マッドシャーク",   level: 2460,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "零の者",           level: 5600,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "翡翠竜",           level: 4040,  location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
      { monsterName: "アビスマーダー",   level: 10000, location: "アイスリッジ山2", locationEn: "Ice Ridge Mountain 2" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ洞窟",
    labelEn: "Ice Ridge Cave",
    presets: [
      { monsterName: "オルトロス",   level: 2741, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "スノーモケラ", level: 2741, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "カニクラブ",   level: 3555, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "ワニゲーター", level: 3740, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "翡翠竜",       level: 3740, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "浮遊イカ",     level: 3555, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "浮遊イカ",     level: 4000, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
      { monsterName: "雪だるまん",   level: 4000, location: "アイスリッジ洞窟", locationEn: "Ice Ridge Cave" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ集落",
    labelEn: "Ice Ridge Village",
    presets: [
      { monsterName: "マッドシャーク",   level: 5700,  location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
      { monsterName: "命を刈り取る者",   level: 6300,  location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
      { monsterName: "命を刈り取る者",   level: 6850,  location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
      { monsterName: "ワニゲーター",     level: 6850,  location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
      { monsterName: "翡翠竜",           level: 6850,  location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
      { monsterName: "ヤマタノオロチ",   level: 8900,  location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
      { monsterName: "氷女王アナトユ",   level: 17000, location: "アイスリッジ集落", locationEn: "Ice Ridge Village" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ峠",
    labelEn: "Ice Ridge Pass",
    presets: [
      { monsterName: "原始蝶",           level: 33,    location: "アイスリッジ峠", locationEn: "Ice Ridge Pass" },
      { monsterName: "BOX",             level: 17000, location: "アイスリッジ峠", locationEn: "Ice Ridge Pass" },
      { monsterName: "零の者",           level: 20000, location: "アイスリッジ峠", locationEn: "Ice Ridge Pass" },
      { monsterName: "封印されし神鯨",   level: 26000, location: "アイスリッジ峠", locationEn: "Ice Ridge Pass" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ崖",
    labelEn: "Ice Ridge Cliff",
    presets: [
      { monsterName: "支配のトリ",       level: 23000, location: "アイスリッジ崖", locationEn: "Ice Ridge Cliff" },
      { monsterName: "元ギルド長ノック", level: 39000, location: "アイスリッジ崖", locationEn: "Ice Ridge Cliff" },
    ],
  },
  // ---- 天空回廊 ----
  {
    mapLabel: "天空回廊",
    mapLabelEn: "Sky Corridor",
    label: "天空回廊",
    labelEn: "Sky Corridor",
    presets: [
      { monsterName: "スカイガーディアン", level: 1100, location: "天空回廊・100の倍数フロア", locationEn: "Sky Corridor - Floors divisible by 100" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "アイスリッジ氷葬",
    labelEn: "Ice Ridge Glacier",
    presets: [
      { monsterName: "翡翠竜",         level: 99999,  location: "アイスリッジ氷葬", locationEn: "Ice Ridge Glacier" },
      { monsterName: "ブタ天使",       level: 165000, location: "アイスリッジ氷葬", locationEn: "Ice Ridge Glacier" },
      { monsterName: "氷結晶",         level: 165000, location: "アイスリッジ氷葬", locationEn: "Ice Ridge Glacier" },
      { monsterName: "超越者リガミア", level: 222222, location: "アイスリッジ氷葬", locationEn: "Ice Ridge Glacier" },
    ],
  },
  {
    mapLabel: "アイスリッジ山",
    mapLabelEn: "Ice Ridge Mtn",
    label: "雪山【禁域】",
    labelEn: "Snowmountain [Forbidden]",
    presets: [
      { monsterName: "禁域のワイバーン",     level: 35000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "BOX",                 level: 50000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "BOX",                 level: 100000, location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "浮遊イカ",             level: 15000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "雪だるまん",           level: 15000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "マッドシャーク",       level: 17000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "キメラキング",         level: 32000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
      { monsterName: "時空竜クロノゼリウス", level: 28000,  location: "雪山【禁域】", locationEn: "Snowmountain [Forbidden]" },
    ],
  },
];

export function formatPresetLabel(preset: EnemyPreset): string {
  const name = preset.monsterName ?? "(名称不明)";
  return `${name} (Lv${preset.level.toLocaleString()}) [${preset.location}]`;
}
