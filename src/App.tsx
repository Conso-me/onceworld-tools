import { useState, useCallback } from "react";
import { DamageCalculator } from "./components/DamageCalculator";
import { FarmCalculator } from "./components/FarmCalculator";
import { StatusSimulator } from "./components/StatusSimulator";
import { TabNav, type Tab } from "./components/ui/TabNav";

const tabs: Tab[] = [
  { id: "damage", label: "ダメージ計算" },
  { id: "farm", label: "周回計算" },
  { id: "status", label: "ステータス" },
];

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    return tabs.find((t) => t.id === hash && !t.disabled)?.id ?? "damage";
  });

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl lg:max-w-[1400px] mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">OnceWorld Tools</h1>
            <div className="flex items-center gap-3">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf6NFySGmPNkQdFJEIwk11gtyvfiFVoJdwUVlwQ3MkN-vNHcg/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                フィードバック
              </a>
              <a
                href="https://buymeacoffee.com/consommex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-500 hover:text-yellow-600 font-medium"
              >
                ☕ Buy me a coffee
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
      </main>

      {/* フッター */}
      <footer className="mt-auto py-3 text-center text-xs text-gray-400">
        <p>OnceWorld 計算ツール</p>
      </footer>
    </div>
  );
}

export default App;
