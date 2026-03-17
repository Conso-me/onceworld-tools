import { useState, useCallback } from "react";
import { DamageCalculator } from "./components/DamageCalculator";
import { FarmCalculator } from "./components/FarmCalculator";
import { StatusSimulator } from "./components/StatusSimulator";
import { ArenaCalculator } from "./components/ArenaCalculator";
import { MonsterEditor } from "./components/MonsterEditor";
import { ArenaBattlePredictor } from "./components/ArenaBattlePredictor";
import { TabNav, type Tab } from "./components/ui/TabNav";
import { PatchNotesModal } from "./components/PatchNotesModal";

const tabs: Tab[] = [
  { id: "damage", label: "ダメージ計算", shortLabel: "ダメ計", icon: "⚔" },
  { id: "arena", label: "裏路地", icon: "🏟" },
  { id: "status", label: "ステータス", icon: "✦" },
  { id: "farm", label: "周回計算", shortLabel: "周回計", icon: "♻" },
  { id: "monsters", label: "モンスター登録", shortLabel: "MON登録", icon: "📋" },
];

function App() {
  // 隠しページ: タブには表示しないがハッシュで直接アクセス可能
  const hiddenPages = ["battle-predictor"] as const;

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    if ((hiddenPages as readonly string[]).includes(hash)) return hash;
    return tabs.find((t) => t.id === hash && !t.disabled)?.id ?? "damage";
  });
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-gradient-to-b from-white to-gray-100 border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl lg:max-w-[1400px] mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-indigo-900 tracking-wide whitespace-nowrap">
              ⚔ Once<span onDoubleClick={() => { setActiveTab("battle-predictor"); window.location.hash = "battle-predictor"; }} className="cursor-default">W</span>orld Tools
            </h1>
            <div className="flex items-center gap-1.5">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf6NFySGmPNkQdFJEIwk11gtyvfiFVoJdwUVlwQ3MkN-vNHcg/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
              >
                フィードバック
              </a>
              <button
                onClick={() => setShowPatchNotes(true)}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
              >
                更新履歴
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1.5" />
              <a
                href="https://buymeacoffee.com/consommex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                ☕<span className="hidden sm:inline"> Buy me a coffee</span>
              </a>
            </div>
          </div>
          <TabNav tabs={tabs} onTabChange={handleTabChange} />
        </div>
      </header>

      {/* メインコンテンツ - 全タブを常にマウントし、非アクティブはCSSで隠す */}
      <main className="max-w-3xl lg:max-w-[1400px] mx-auto px-4 py-6 lg:py-2">
        <div className={activeTab === "damage" ? "" : "hidden"}>
          <DamageCalculator />
        </div>
        <div className={activeTab === "farm" ? "" : "hidden"}>
          <FarmCalculator />
        </div>
        <div className={activeTab === "status" ? "" : "hidden"}>
          <StatusSimulator />
        </div>
        <div className={activeTab === "arena" ? "" : "hidden"}>
          <ArenaCalculator />
        </div>
        <div className={activeTab === "monsters" ? "" : "hidden"}>
          <MonsterEditor />
        </div>
        <div className={activeTab === "battle-predictor" ? "" : "hidden"}>
          <ArenaBattlePredictor />
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-auto py-3 text-center text-xs text-gray-400">
        <p>OnceWorld 計算ツール</p>
      </footer>

      {showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}
    </div>
  );
}

export default App;
