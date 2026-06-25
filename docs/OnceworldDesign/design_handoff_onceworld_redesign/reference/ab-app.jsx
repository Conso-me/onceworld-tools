// A/B切り替えプロトタイプ — Clarity(A) ⇄ Grimoire(B)
// exports: ABApp

const abCSS = `
.ow * { margin: 0; padding: 0; box-sizing: border-box; }
.ow {
  font-family: 'Zen Kaku Gothic New', sans-serif;
  background: var(--bg-layer, var(--bg));
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
}
.ow .num { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.ow .head { font-family: var(--font-head); letter-spacing: var(--head-ls, 0); }

/* ============ theme tokens ============ */
.ow[data-theme="a"] {
  --bg: #faf9f7; --card: #ffffff; --ink: #1f1d18; --muted: #8d877b;
  --line: #e9e5dd; --accent: #3d63dd; --accent-soft: #eef1fc; --accent-ink: #ffffff;
  --warn: #c2410c; --radius: 12px; --radius-s: 8px;
  --font-head: 'Zen Kaku Gothic New', sans-serif;
  --fire: #d65441; --water: #3b82c4; --wood: #4d9e62; --light: #d9a428; --dark: #7b5fc0;
  --field-bg: #faf9f7;
}
.ow[data-theme="b"] {
  --bg: #f1e9d8; --card: #faf5e9; --ink: #3b3022; --muted: #8c7f68;
  --line: #d9cdaf; --accent: #a98736; --accent-soft: #f0e6cc; --accent-ink: #faf5e9;
  --warn: #9a4a22; --radius: 2px; --radius-s: 2px;
  --font-head: 'Shippori Mincho', serif; --head-ls: 0.06em;
  --fire: #b4452f; --water: #2f6b9e; --wood: #3f7d4e; --light: #b78a1f; --dark: #6b4fa0;
  --field-bg: #f1e9d8;
  --bg-layer: repeating-linear-gradient(0deg, rgba(169,135,54,0.03) 0px, rgba(169,135,54,0.03) 1px, transparent 1px, transparent 7px), #f1e9d8;
}

/* ============ header ============ */
.ow-header {
  background: var(--card); border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 24px; padding: 0 24px; height: 60px;
  position: sticky; top: 0; z-index: 20; transition: background 0.3s, border-color 0.3s;
}
.ow[data-theme="b"] .ow-header { border-bottom: 2px solid var(--accent); }
.ow-logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; white-space: nowrap; font-family: var(--font-head); }
.ow-logo-mark { width: 12px; height: 12px; background: var(--accent); border-radius: 3px; transform: rotate(45deg); transition: background 0.3s; }
.ow[data-theme="b"] .ow-logo-mark { border-radius: 0; }
.ow-nav { display: flex; gap: 4px; height: 100%; align-items: center; }
.ow-nav-item {
  display: flex; align-items: center; padding: 0 14px; font-size: 14px; color: var(--muted);
  cursor: pointer; white-space: nowrap; height: 100%; border-bottom: 2px solid transparent;
  font-family: var(--font-head); transition: color 0.2s;
}
.ow-nav-item:hover { color: var(--ink); }
.ow-nav-item.on { color: var(--ink); font-weight: 700; border-bottom-color: var(--accent); }
.ow-utils { margin-left: auto; display: flex; gap: 14px; font-size: 12px; color: var(--muted); align-items: center; white-space: nowrap; }
.ow-utils span { cursor: pointer; }
.ow-utils span:hover { color: var(--ink); }

/* theme switch */
.ow-switch {
  display: flex; border: 1px solid var(--line); border-radius: 999px; padding: 3px;
  background: var(--field-bg); cursor: pointer; flex: none;
}
.ow-switch-item {
  display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;
  padding: 4px 12px; border-radius: 999px; color: var(--muted); white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}
.ow-switch-item.on { background: var(--accent); color: var(--accent-ink); }
.ow-switch-dot { width: 8px; height: 8px; transform: rotate(45deg); background: currentColor; border-radius: 2px; }

/* ============ layout ============ */
.ow-main { padding: 20px 24px 48px; display: flex; flex-direction: column; gap: 16px; max-width: 1480px; margin: 0 auto; }
.ow-grid { display: grid; grid-template-columns: 330px minmax(0,1fr) 350px; gap: 16px; align-items: start; }
@media (max-width: 1100px) {
  .ow-grid { grid-template-columns: 1fr 1fr; }
  .ow-grid .ow-col-dmg { grid-column: 1 / -1; order: 3; }
}
@media (max-width: 1200px) {
  .ow-utils .ow-util-link { display: none; }
}
@media (max-width: 900px) {
  .ow-nav-item { padding: 0 9px; font-size: 13px; }
  .ow-header { gap: 14px; }
}
@media (max-width: 760px) {
  .ow-main { padding: 14px 12px 110px; }
  .ow-grid { grid-template-columns: 1fr; }
  .ow-header { padding: 0 14px; gap: 12px; }
  .ow-nav { display: none; }
  .ow-enemy-row { flex-direction: column; align-items: stretch; gap: 12px; }
  .ow-estats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; border-left: none; padding-top: 10px; border-top: 1px solid var(--line); min-width: 0; }
  .ow-estat { padding: 0; }
}

/* ============ cards ============ */
.ow-card {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.ow[data-theme="b"] .ow-card {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 3px var(--card), inset 0 0 0 4px var(--line);
  padding: 4px;
}
.ow-card-h { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-bottom: 1px solid var(--line); }
.ow-card-title { font-size: 13px; font-weight: 700; font-family: var(--font-head); letter-spacing: var(--head-ls, 0); }
.ow-card-action { margin-left: auto; font-size: 12px; color: var(--accent); font-weight: 500; cursor: pointer; white-space: nowrap; }
.ow-card-action:hover { text-decoration: underline; }
.ow-step {
  width: 20px; height: 20px; border-radius: 50%; background: var(--ink); color: var(--card);
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex: none;
  transition: background 0.3s;
}
.ow[data-theme="b"] .ow-step {
  background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 0;
  transform: rotate(45deg); font-family: 'Shippori Mincho', serif;
}
.ow[data-theme="b"] .ow-step i { font-style: normal; display: block; transform: rotate(-45deg); }

/* ============ chips / gems ============ */
.ow-chip {
  font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; color: #fff; white-space: nowrap;
}
.ow[data-theme="b"] .ow-chip { border-radius: 0; }
.ow-chip.outline { color: var(--muted); background: none !important; border: 1px solid var(--line); font-weight: 500; }
.ow-el {
  width: 32px; height: 32px; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex: none; transition: border-radius 0.3s, transform 0.3s;
}
.ow-el i { font-style: normal; }
.ow[data-theme="b"] .ow-el {
  transform: rotate(45deg) scale(0.82); border-radius: 5px;
  border: 1px solid rgba(59,48,34,0.3); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.35);
}
.ow[data-theme="b"] .ow-el i { transform: rotate(-45deg); }

/* ============ enemy bar ============ */
.ow-enemy-row { display: flex; align-items: center; gap: 20px; padding: 16px; flex-wrap: wrap; }
.ow-enemy-name { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; font-family: var(--font-head); flex-wrap: wrap; }
.ow-enemy-loc { font-size: 11px; color: var(--muted); margin-top: 4px; }
.ow-estats { display: flex; flex: 1; border-left: 1px solid var(--line); flex-wrap: wrap; row-gap: 8px; min-width: 280px; }
.ow-estat { padding: 2px 16px; display: flex; flex-direction: column; gap: 1px; }
.ow-estat-k { font-size: 9px; font-weight: 700; color: var(--muted); letter-spacing: 0.12em; }
.ow[data-theme="b"] .ow-estat-k { color: var(--accent); }
.ow-estat-v { font-size: 14px; font-weight: 700; }
.ow-estat-b { font-size: 10px; color: var(--muted); }
.ow-enemy-foot { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid var(--line); font-size: 12px; flex-wrap: wrap; }


/* ============ controls ============ */
.ow-select {
  border: 1px solid var(--line); border-radius: var(--radius-s); padding: 7px 12px; font-size: 12px;
  background: var(--field-bg); display: flex; align-items: center; gap: 8px; color: var(--ink);
  white-space: nowrap; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
}
.ow-btn {
  border: 1px solid var(--line); background: var(--card); border-radius: var(--radius-s);
  padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--ink); white-space: nowrap;
}
.ow-btn.ghost { border-color: var(--accent); color: var(--accent); font-weight: 700; background: none; }
.ow-btn.ghost:hover { background: var(--accent-soft); }
.ow-seg { display: flex; background: var(--field-bg); border: 1px solid var(--line); border-radius: var(--radius-s); padding: 3px; }
.ow[data-theme="b"] .ow-seg { padding: 0; }
.ow-seg-item {
  flex: 1; text-align: center; font-size: 12px; padding: 6px 0; border-radius: calc(var(--radius-s) - 2px);
  color: var(--muted); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.ow[data-theme="a"] .ow-seg-item.on { background: var(--card); color: var(--ink); font-weight: 700; box-shadow: 0 1px 2px rgba(31,29,24,0.08); }
.ow[data-theme="b"] .ow-seg-item.on { background: var(--ink); color: var(--card); font-weight: 700; }
.ow-field { display: flex; flex-direction: column; gap: 6px; }
.ow-label { font-size: 10px; font-weight: 700; color: var(--muted); letter-spacing: 0.1em; }
.ow[data-theme="b"] .ow-label { color: var(--accent); }
.ow-input {
  border: 1px solid var(--line); border-radius: var(--radius-s); padding: 8px 12px; font-size: 13px;
  background: var(--card); display: flex; align-items: center; justify-content: space-between;
}
.ow-input .sub { font-size: 11px; color: var(--muted); }
.ow-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ow-subtabs { display: flex; border-bottom: 1px solid var(--line); }
.ow[data-theme="b"] .ow-subtabs { border-bottom-color: var(--accent); }
.ow-subtab { font-size: 12px; padding: 8px 12px; color: var(--muted); border-bottom: 2px solid transparent; cursor: pointer; }
.ow[data-theme="a"] .ow-subtab.on { color: var(--ink); font-weight: 700; border-bottom-color: var(--ink); }
.ow[data-theme="b"] .ow-subtab.on { color: var(--card); background: var(--accent); font-weight: 700; }
.ow-pane { padding: 14px 16px; display: flex; flex-direction: column; gap: 13px; }
.ow-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); white-space: nowrap; }
.ow[data-theme="b"] .ow-pill { border-radius: 0; }

/* ============ damage ============ */
.ow-affinity {
  display: flex; align-items: center; gap: 10px; padding: 11px 16px; font-size: 12px;
  background: var(--accent-soft); border-bottom: 1px solid var(--line);
}
.ow-skill { display: flex; align-items: center; gap: 13px; padding: 13px 16px; border-bottom: 1px solid var(--line); }
.ow[data-theme="b"] .ow-skill { border-bottom-style: dashed; }
.ow-skill:last-child { border-bottom: none !important; }
.ow-skill-info { display: flex; flex-direction: column; gap: 2px; min-width: 110px; }
.ow-skill-name { font-size: 14px; font-weight: 700; font-family: var(--font-head); }
.ow-skill-mult { font-size: 11px; color: var(--muted); }
.ow-skill-dmg { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 0; }
.ow-skill-range { font-size: 16px; font-weight: 700; text-align: right; }
.ow-skill-range .nw { white-space: nowrap; }
.ow-skill-range .tilde { color: var(--muted); font-weight: 400; padding: 0 4px; }
.ow-skill-ok { font-size: 11px; color: var(--warn); white-space: nowrap; }
.ow-hits {
  flex: none; font-size: 12px; font-weight: 700; color: var(--ink); font-family: var(--font-head);
  border: 1px solid var(--line); border-radius: var(--radius-s); padding: 5px 10px; min-width: 46px; text-align: center;
  background: var(--field-bg);
}
.ow[data-theme="a"] .ow-hits.best { background: var(--ink); color: #fff; border-color: var(--ink); }
.ow[data-theme="b"] .ow-hits.best { background: var(--accent); color: var(--card); border-color: var(--accent); }
@media (max-width: 540px) {
  .ow-skill { flex-wrap: wrap; }
  .ow-skill-dmg { width: 100%; align-items: flex-start; margin-left: 45px; }
  .ow-skill-range { font-size: 14px; }
}

/* ============ defense ============ */
.ow-def-block { padding: 14px 16px; display: flex; flex-direction: column; gap: 11px; border-bottom: 1px solid var(--line); }
.ow-def-block:last-child { border-bottom: none; }
.ow-def-title { font-size: 13px; font-weight: 700; font-family: var(--font-head); }
.ow-def-sub { font-size: 11px; color: var(--muted); }
.ow-bar { height: 6px; background: var(--field-bg); border-radius: 999px; overflow: hidden; border: 1px solid var(--line); }
.ow-bar-fill { height: 100%; background: var(--accent); border-radius: 999px; transition: background 0.3s; }
.ow-kv { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ow-kv-k { font-size: 12px; color: var(--muted); white-space: nowrap; }
.ow-kv-v { font-size: 14px; font-weight: 700; }
.ow-kv-note { font-size: 11px; color: var(--warn); white-space: nowrap; }
.ow-survive {
  display: flex; align-items: center; justify-content: space-between;
  border-radius: var(--radius-s); padding: 13px 16px; transition: background 0.3s;
}
.ow[data-theme="a"] .ow-survive { background: var(--ink); color: #fff; }
.ow[data-theme="b"] .ow-survive { background: var(--accent-soft); border: 1px solid var(--accent); }
.ow-survive-k { font-size: 12px; opacity: 0.75; font-family: var(--font-head); }
.ow-survive-v { font-size: 22px; font-weight: 700; font-family: var(--font-head); white-space: nowrap; }
.ow[data-theme="b"] .ow-survive-v { color: var(--accent); }

/* ============ mobile sticky summary ============ */
.ow-msticky {
  display: none; position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 30;
  align-items: center; justify-content: space-between; padding: 13px 16px;
  border-radius: var(--radius); box-shadow: 0 8px 24px rgba(31,29,24,0.3);
}
.ow[data-theme="a"] .ow-msticky { background: var(--ink); color: #fff; }
.ow[data-theme="b"] .ow-msticky { background: var(--ink); color: var(--card); border: 1px solid var(--accent); }
@media (max-width: 760px) { .ow-msticky { display: flex; } }

/* ============ toast ============ */
.ow-toast {
  position: fixed; top: 74px; left: 50%; transform: translateX(-50%); z-index: 50;
  background: var(--ink); color: var(--card); font-size: 12px; font-weight: 700;
  padding: 9px 18px; border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  animation: owToast 1.8s forwards;
}
@keyframes owToast {
  0% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  12%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
}
`;

const AB_LABELS = {
  a: {
    enemy: "敵を選ぶ", me: "自分のステータス", dmg: "与ダメージ", def: "被ダメージ",
    survive: "受けられる回数", overkill: "Overkill まで INT", kill: "で撃破",
  },
  b: {
    enemy: "魔物の書 — 敵を選ぶ", me: "冒険者の備え", dmg: "討伐の見立て — 与ダメージ", def: "護りの見立て — 被ダメージ",
    survive: "耐えうる回数", overkill: "一撃必殺まで INT", kill: "で討伐",
  },
};

function OwEl({ el, kanji }) {
  return <span className="ow-el" style={{ background: `var(--${el})` }}><i>{kanji}</i></span>;
}
function OwStep({ n }) {
  return <span className="ow-step"><i>{n}</i></span>;
}
function OwSeg({ items, value, onChange }) {
  return (
    <div className="ow-seg">
      {items.map((it) => (
        <div key={it} className={"ow-seg-item" + (value === it ? " on" : "")} onClick={() => onChange(it)}>{it}</div>
      ))}
    </div>
  );
}

function ABHeader({ theme, setTheme, onCopy }) {
  return (
    <div className="ow-header">
      <div className="ow-logo"><span className="ow-logo-mark"></span>OnceWorld Tools</div>
      <div className="ow-nav">
        {OW.nav.map((n, i) => <div key={n} className={"ow-nav-item" + (i === 0 ? " on" : "")}>{n}</div>)}
      </div>
      <div className="ow-utils">
        {OW.utils.map((u) => <span key={u} className="ow-util-link">{u}</span>)}
        <div className="ow-switch" title="デザインテーマ切り替え">
          <div className={"ow-switch-item" + (theme === "a" ? " on" : "")} onClick={() => setTheme("a")}>
            <span className="ow-switch-dot"></span>ミニマル
          </div>
          <div className={"ow-switch-item" + (theme === "b" ? " on" : "")} onClick={() => setTheme("b")}>
            <span className="ow-switch-dot"></span>ファンタジー
          </div>
        </div>
      </div>
    </div>
  );
}

function ABEnemy({ L, onCopy }) {
  const m = OW.monster;
  return (
    <div className="ow-card">
      <div className="ow-card-h">
        <OwStep n="1" />
        <div className="ow-card-title">{L.enemy}</div>
        <div className="ow-card-action">カスタムモンスター +</div>
      </div>
      <div className="ow-enemy-row">
        <div style={{ minWidth: 230 }}>
          <div className="ow-enemy-name">
            {m.name}
            <span className="ow-chip" style={{ background: "var(--dark)" }}>{m.element}</span>
            <span className="ow-chip outline">{m.attackType}</span>
          </div>
          <div className="ow-enemy-loc">Lv {m.level} ・ {m.location}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {m.traits.map((t) => <span key={t} className="ow-chip outline">{t}</span>)}
          </div>
        </div>
        <div className="ow-estats">
          <div className="ow-estat">
            <span className="ow-estat-k">HP</span>
            <span className="ow-estat-v num">{m.hp}</span>
            <span className="ow-estat-b num">EXP {m.exp}</span>
          </div>
          {m.stats.map((s) => (
            <div className="ow-estat" key={s.key}>
              <span className="ow-estat-k">{s.key}</span>
              <span className="ow-estat-v num">{s.value}</span>
              <span className="ow-estat-b num">({s.base})</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ow-enemy-foot">
        <div className="ow-select">グラビティスライム (Lv390,000) [循環宇宙最深部・左右] ▾</div>
        <div className="ow-input num" style={{ width: 130 }}>Lv 390,000</div>
        <span style={{ flex: 1 }}></span>
        <div className="ow-btn ghost" onClick={onCopy}>URLをコピー</div>
      </div>
    </div>
  );
}

function ABInputs({ L }) {
  const me = OW.me;
  const [who, setWho] = React.useState("主人公");
  const [mode, setMode] = React.useState("装備設定");
  const [atk, setAtk] = React.useState("魔法");
  const [tab, setTab] = React.useState("基本");
  return (
    <div className="ow-card">
      <div className="ow-card-h">
        <OwStep n="2" />
        <div className="ow-card-title">{L.me}</div>
      </div>
      <div className="ow-pane">
        <OwSeg items={["主人公", "ペット"]} value={who} onChange={setWho} />
        <div className="ow-row2">
          <div className="ow-field">
            <div className="ow-label">入力モード</div>
            <OwSeg items={["手動", "装備設定"]} value={mode} onChange={setMode} />
          </div>
          <div className="ow-field">
            <div className="ow-label">攻撃方法</div>
            <OwSeg items={["物理", "魔法"]} value={atk} onChange={setAtk} />
          </div>
        </div>
        <div className="ow-field">
          <div className="ow-label">ビルドプリセット</div>
          <div className="ow-select">-- プリセットを選択 -- <span style={{ marginLeft: "auto", color: "var(--muted)" }}>▾</span></div>
        </div>
        <div className="ow-subtabs">
          {["基本", "装備", "アクセ", "ペット", "その他"].map((t) => (
            <div key={t} className={"ow-subtab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</div>
          ))}
        </div>
        <div className="ow-row2">
          <div className="ow-field">
            <div className="ow-label">レベル</div>
            <div className="ow-input num">{me.level} <span className="sub">MAX</span></div>
          </div>
          <div className="ow-field">
            <div className="ow-label">転生</div>
            <div className="ow-input num">22 <span className="sub">天命輪廻</span></div>
          </div>
        </div>
        <div className="ow-row2">
          <div className="ow-field">
            <div className="ow-label">属性</div>
            <div className="ow-select">光 <span style={{ marginLeft: "auto", color: "var(--muted)" }}>▾</span></div>
          </div>
          <div className="ow-field">
            <div className="ow-label">コスモキューブ</div>
            <div className="ow-input num">✓ <span className="sub">+220,000pt</span></div>
          </div>
        </div>
        <div className="ow-field">
          <div className="ow-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            割り振りポイント <span className="ow-pill">残り 0</span>
            <span style={{ marginLeft: "auto", color: "var(--accent)", cursor: "pointer" }}>リセット</span>
          </div>
          {me.points.map((p) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", width: 38 }}>{p.key}</span>
              <div className="ow-input num" style={{ flex: 1, justifyContent: "flex-end" }}>{p.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ABDamage({ L }) {
  return (
    <div className="ow-card ow-col-dmg">
      <div className="ow-card-h">
        <OwStep n="3" />
        <div className="ow-card-title">{L.dmg}</div>
        <div className="ow-card-action">{OW.attack.kind}</div>
      </div>
      <div className="ow-affinity">
        <span className="ow-chip" style={{ background: "var(--light)" }}>光</span>→
        <span className="ow-chip" style={{ background: "var(--dark)" }}>闇</span>
        <span style={{ whiteSpace: "nowrap" }}>弱点 ×1.2</span>
      </div>
      {OW.skills.map((s) => (
        <div className="ow-skill" key={s.name}>
          <OwEl el={s.el} kanji={s.elKanji} />
          <div className="ow-skill-info">
            <div className="ow-skill-name">{s.name}</div>
            <div className="ow-skill-mult">{s.mult}</div>
          </div>
          <div className="ow-skill-dmg">
            <div className="ow-skill-range num"><span className="nw">{s.min}</span><span className="tilde">〜</span><span className="nw">{s.max}</span></div>
            <div className="ow-skill-ok num">{L.overkill} {s.lack}</div>
          </div>
          <div className={"ow-hits" + (s.hits === "1回" ? " best" : "")}>{s.hits}</div>
        </div>
      ))}
    </div>
  );
}

function ABDefense({ L }) {
  const d = OW.defense;
  return (
    <div className="ow-card">
      <div className="ow-card-h">
        <OwStep n="3" />
        <div className="ow-card-title">{L.def}</div>
        <div className="ow-card-action">最低INT</div>
      </div>
      <div className="ow-def-block">
        <div>
          <div className="ow-def-title">{d.title}</div>
          <div className="ow-def-sub num">{d.sub}</div>
        </div>
        <div className="ow-kv">
          <span className="ow-kv-k">DEF進捗</span>
          <span className="ow-kv-v num" style={{ fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>{d.progressNow} / {d.progressMax}</span>
        </div>
        <div className="ow-bar"><div className="ow-bar-fill" style={{ width: d.progressPct + "%" }}></div></div>
        <div className="ow-kv" style={{ alignItems: "flex-start" }}>
          <span className="ow-kv-k">DEFのみで無効化</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span className="ow-kv-v num">{d.defOnly}</span>
            <span className="ow-kv-note num">あと {d.defOnlyLack}</span>
          </span>
        </div>
        <div className="ow-kv" style={{ alignItems: "flex-start" }}>
          <span className="ow-kv-k">M-DEFのみで無効化</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span className="ow-kv-v num">{d.mdefOnly}</span>
            <span className="ow-kv-note num">あと {d.mdefOnlyLack}</span>
          </span>
        </div>
        <div className="ow-kv">
          <span className="ow-kv-k">補うなら</span>
          <span className="ow-kv-v num" style={{ fontSize: 12, fontWeight: 500 }}>M-DEF {d.fillMdef} / DEF {d.fillDef}</span>
        </div>
      </div>
      <div className="ow-def-block">
        <div className="ow-kv"><span className="ow-kv-k">現在の被ダメージ <span className="num">{d.dmgHits}</span></span></div>
        <div className="ow-kv-v num" style={{ fontSize: 19 }}>{d.dmgMin} <span style={{ color: "var(--muted)", fontWeight: 400 }}>〜</span> {d.dmgMax}</div>
        <div className="ow-kv">
          <span className="ow-kv-k">自HP</span>
          <span className="ow-kv-v num" style={{ fontWeight: 500 }}>{d.myHp}</span>
        </div>
        <div className="ow-survive">
          <span className="ow-survive-k">{L.survive}</span>
          <span className="ow-survive-v num">{d.survives}</span>
        </div>
      </div>
    </div>
  );
}

function ABApp() {
  const [theme, setThemeState] = React.useState(() => {
    try { return localStorage.getItem("ow-ab-theme") === "b" ? "b" : "a"; } catch (e) { return "a"; }
  });
  const setTheme = (t) => {
    setThemeState(t);
    try { localStorage.setItem("ow-ab-theme", t); } catch (e) {}
  };
  const [toast, setToast] = React.useState(0);
  const onCopy = () => setToast(Date.now());
  const L = AB_LABELS[theme];
  const d = OW.defense;
  return (
    <div className="ow" data-theme={theme}>
      <style>{abCSS}</style>
      <ABHeader theme={theme} setTheme={setTheme} onCopy={onCopy} />
      <div className="ow-main">
        <ABEnemy L={L} onCopy={onCopy} />
        <div className="ow-grid">
          <ABInputs L={L} />
          <ABDamage L={L} />
          <ABDefense L={L} />
        </div>
      </div>
      <div className="ow-msticky">
        <span style={{ fontSize: 11, opacity: 0.7 }}>{L.survive}</span>
        <span className="num head" style={{ fontSize: 17, fontWeight: 700 }}>{d.survives}</span>
        <span className="num" style={{ fontSize: 11, opacity: 0.7 }}>被ダメ {d.dmgMin}〜</span>
      </div>
      {toast ? <div className="ow-toast" key={toast}>共有URLをコピーしました(モック)</div> : null}
    </div>
  );
}

Object.assign(window, { ABApp });
