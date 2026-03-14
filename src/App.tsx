import { useState, useCallback } from "react";
import { DamageCalculator } from "./components/DamageCalculator";
import { ExpCalculator } from "./components/ExpCalculator";
import { GoldCalculator } from "./components/GoldCalculator";
import { TabNav, type Tab } from "./components/ui/TabNav";

const tabs: Tab[] = [
  { id: "damage", label: "ダメージ計算" },
  { id: "exp", label: "経験値計算" },
  { id: "gold", label: "金策計算" },
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
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <h1 className="text-xl font-bold text-gray-800">OnceWorld Tools</h1>
          <TabNav tabs={tabs} onTabChange={handleTabChange} />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {activeTab === "damage" && <DamageCalculator />}
        {activeTab === "exp" && <ExpCalculator />}
        {activeTab === "gold" && <GoldCalculator />}
      </main>

      {/* フッター */}
      <footer className="mt-auto py-6 text-center text-xs text-gray-400">
        <p>OnceWorld 計算ツール</p>
      </footer>
    </div>
  );
}

export default App;
