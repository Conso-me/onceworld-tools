// 共通データ — 現行サイトのスクリーンショットから採取した実データ
window.OW = {
  nav: ["ダメージ計算", "天空回廊", "ステータス", "ペットバトル"],
  utils: ["機能説明", "フィードバック", "更新履歴", "装備確認"],
  monster: {
    name: "グラビティスライム",
    level: "390,000",
    element: "闇",
    attackType: "物理",
    location: "循環宇宙最深部・左右",
    hp: "183,226,312",
    exp: "31,398,859,800",
    stats: [
      { key: "ATK", value: "7,254,167", base: "186" },
      { key: "INT", value: "936,021", base: "24" },
      { key: "DEF", value: "8,619,198", base: "221" },
      { key: "M-DEF", value: "9,594,221", base: "246" },
      { key: "SPD", value: "2,184,050", base: "56" },
      { key: "LUCK", value: "4,563,105", base: "117" }
    ],
    traits: ["木魔法 DEF×½", "闇魔法 LUK×½"]
  },
  // el: fire / water / wood / light / dark
  skills: [
    { el: "fire",  elKanji: "火", name: "炎帝轟火", mult: "×1 / 4連", hits: "1回",
      min: "359,893,760", max: "439,870,152", needInt: "31,505,628", lack: "+29,331,477" },
    { el: "water", elKanji: "水", name: "氷槍陣", mult: "×1", hits: "3回",
      min: "89,973,440", max: "109,967,538", needInt: "31,505,628", lack: "+29,331,477" },
    { el: "wood",  elKanji: "木", name: "大地葬送", mult: "×1.3", hits: "2回",
      min: "130,516,631", max: "159,520,326", needInt: "24,211,791", lack: "+22,037,640" },
    { el: "light", elKanji: "光", name: "雷鳴一閃", mult: "×2", hits: "1回",
      min: "225,117,409", max: "275,143,500", needInt: "15,702,314", lack: "+13,528,163" },
    { el: "dark",  elKanji: "闇", name: "冥刃降臨", mult: "×1.4", hits: "2回",
      min: "156,234,890", max: "190,953,532", needInt: "22,481,055", lack: "+20,306,904" }
  ],
  attack: {
    kind: "魔法攻撃",
    affinity: "光 → 闇 弱点×1.2"
  },
  defense: {
    title: "物理攻撃",
    sub: "物理 / ATK: 7,254,167",
    progressNow: "7,797,786",
    progressMax: "12,694,793",
    progressPct: 61,
    defOnly: "12,694,793", defOnlyLack: "4,897,007",
    mdefOnly: "126,947,923", mdefOnlyLack: "116,993,602",
    fillMdef: "+39,015,742", fillDef: "+3,901,575",
    dmgMin: "16,854,800", dmgMax: "20,600,312", dmgHits: "×7",
    myHp: "761,740,166",
    survives: "6〜6回"
  },
  me: {
    level: "183",
    rincarnation: "天命輪廻 22回",
    element: "光",
    cube: "コスモキューブ +220,000pt",
    points: [
      { key: "VIT", value: "0" },
      { key: "SPD", value: "0" },
      { key: "ATK", value: "5,000,000" }
    ]
  }
};
