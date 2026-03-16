import { useState, useRef } from "react";
import type { MonsterBase, Element, AttackType } from "../types/game";
import { getCustomMonsters, setCustomMonsters, getAllMonsters } from "../data/monsters";

const ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];
const ATTACK_TYPES: AttackType[] = ["物理", "魔弾", "魔攻"];

const elementColors: Record<Element, string> = {
  火: "bg-red-100 text-red-700 border-red-300",
  水: "bg-blue-100 text-blue-700 border-blue-300",
  木: "bg-green-100 text-green-700 border-green-300",
  光: "bg-yellow-100 text-yellow-700 border-yellow-300",
  闇: "bg-purple-100 text-purple-700 border-purple-300",
};

const DEFAULT_FORM: MonsterBase = {
  name: "",
  level: 1,
  element: "火",
  attackType: "物理",
  vit: 0, spd: 0, atk: 0, int: 0, def: 0, mdef: 0, luck: 0,
  mov: 3,
  captureRate: 50,
  exp: 0,
  gold: 0,
};

const STAT_FIELDS: Array<{ key: keyof MonsterBase; label: string }> = [
  { key: "vit",  label: "VIT"  },
  { key: "spd",  label: "SPD"  },
  { key: "atk",  label: "ATK"  },
  { key: "int",  label: "INT"  },
  { key: "def",  label: "DEF"  },
  { key: "mdef", label: "MDEF" },
  { key: "luck", label: "LUK"  },
  { key: "mov",  label: "MOV"  },
];

export function MonsterEditor() {
  const [customs, setCustoms] = useState<MonsterBase[]>(() => getCustomMonsters());
  const [form, setForm] = useState<MonsterBase>(DEFAULT_FORM);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function save(updated: MonsterBase[]) {
    setCustomMonsters(updated);
    setCustoms(updated);
  }

  function handleSubmit() {
    const name = form.name.trim();
    if (!name) {
      setError("モンスター名を入力してください");
      return;
    }
    if (form.level < 1) {
      setError("レベルは1以上にしてください");
      return;
    }
    // 重複チェック（編集中のものは除外）
    const allNames = getAllMonsters()
      .filter(m => m.name !== editingName)
      .map(m => m.name);
    if (allNames.includes(name)) {
      setError("同名のモンスターが既に存在します");
      return;
    }

    if (editingName !== null) {
      save(customs.map(m => m.name === editingName ? { ...form, name } : m));
    } else {
      save([...customs, { ...form, name }]);
    }
    setForm(DEFAULT_FORM);
    setEditingName(null);
    setError("");
  }

  function handleEdit(m: MonsterBase) {
    setForm({ ...m });
    setEditingName(m.name);
    setError("");
  }

  function handleDelete(name: string) {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    save(customs.filter(m => m.name !== name));
    if (editingName === name) {
      setForm(DEFAULT_FORM);
      setEditingName(null);
    }
  }

  function handleCancel() {
    setForm(DEFAULT_FORM);
    setEditingName(null);
    setError("");
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(customs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom-monsters.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as MonsterBase[];
        if (!Array.isArray(data)) throw new Error();
        const existing = new Set(getAllMonsters().map(m => m.name));
        const imported = data.filter(m => m.name && !existing.has(m.name));
        const skipped = data.length - imported.length;
        save([...customs, ...imported]);
        alert(`${imported.length}件インポート${skipped > 0 ? `、${skipped}件スキップ（重複）` : ""}`);
      } catch {
        alert("JSONの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function setNum(field: keyof MonsterBase, value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    setForm(f => ({ ...f, [field]: digits === "" ? 0 : parseInt(digits, 10) }));
  }

  function setDecimal(field: keyof MonsterBase, value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1");
    setForm(f => ({ ...f, [field]: cleaned === "" ? 0 : parseFloat(cleaned) }));
  }

  function blockNonDigit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
  }

  function blockNonDecimal(e: React.KeyboardEvent<HTMLInputElement>) {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  }

  const numHandlers = (field: keyof MonsterBase) => ({
    type: "text" as const,
    inputMode: "numeric" as const,
    onKeyDown: blockNonDigit,
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => {
      setNum(field, e.currentTarget.value);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!(e.nativeEvent as InputEvent).isComposing) setNum(field, e.target.value);
    },
  });

  const decimalHandlers = (field: keyof MonsterBase) => ({
    type: "text" as const,
    inputMode: "decimal" as const,
    onKeyDown: blockNonDecimal,
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => {
      setDecimal(field, e.currentTarget.value);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!(e.nativeEvent as InputEvent).isComposing) setDecimal(field, e.target.value);
    },
  });

  return (
    <div className="max-w-lg mx-auto space-y-4 lg:max-w-none lg:space-y-0 lg:grid lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-2 lg:items-start">

      {/* 左：入力フォーム */}
      <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">
          {editingName !== null ? `編集中：${editingName}` : "新規モンスター登録"}
        </h2>

        {/* 名前 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">モンスター名</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="例：グリーンスライム改"
          />
        </div>

        {/* レベル */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">レベル</label>
          <input
            {...numHandlers("level")}
            value={form.level || ""}
            className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right"
          />
        </div>

        {/* 属性 */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">属性</label>
          <div className="flex gap-1">
            {ELEMENTS.map(el => (
              <button
                key={el}
                onClick={() => setForm(f => ({ ...f, element: el }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  form.element === el
                    ? elementColors[el]
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {el}
              </button>
            ))}
          </div>
        </div>

        {/* 攻撃タイプ */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">攻撃タイプ</label>
          <div className="flex gap-1">
            {ATTACK_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, attackType: t }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  form.attackType === t
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ステータス */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">基本ステータス</label>
          <div className="grid grid-cols-4 gap-1.5">
            {STAT_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] text-gray-400 block">{label}</label>
                <input
                  {...numHandlers(key)}
                  value={(form[key] as number) || ""}
                  className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 text-right"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 捕獲率・EXP・ゴールド */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">捕獲率(%)</label>
            <input
              {...decimalHandlers("captureRate")}
              value={form.captureRate || ""}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">EXP</label>
            <input
              {...numHandlers("exp")}
              value={form.exp || ""}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">ゴールド</label>
            <input
              {...numHandlers("gold")}
              value={form.gold || ""}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* 登録ボタン */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {editingName !== null ? "更新" : "登録"}
          </button>
          {editingName !== null && (
            <button
              onClick={handleCancel}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg transition-colors"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>

      {/* 右：登録済みリスト */}
      <div className="bg-white rounded-2xl shadow shadow-gray-200/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">
            登録済み（{customs.length}件）
          </h2>
          <div className="flex gap-1.5">
            <button
              onClick={handleExport}
              disabled={customs.length === 0}
              className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              エクスポート
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              インポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        {customs.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            カスタムモンスターはまだ登録されていません
          </p>
        ) : (
          <div className="space-y-1.5 overflow-y-auto max-h-[60vh]">
            {customs.map(m => (
              <div
                key={m.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                  editingName === m.name
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
                    <span className="text-xs text-gray-400">Lv{m.level}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${elementColors[m.element]}`}>
                      {m.element}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-100 text-gray-500 border-gray-200">
                      {m.attackType}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    EXP: {m.exp.toLocaleString()} / G: {m.gold.toLocaleString()} / 捕獲: {m.captureRate}%
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(m)}
                    className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(m.name)}
                    className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
          カスタムモンスターはブラウザに保存されます。ダメ計・周回計算でも使用できます。
        </p>
      </div>
    </div>
  );
}
