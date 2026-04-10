import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DamageCalculator } from "./components/DamageCalculator";
import { FarmCalculator } from "./components/FarmCalculator";
import { StatusSimulator } from "./components/StatusSimulator";
import { ArenaCalculator } from "./components/ArenaCalculator";
import { MonsterEditor } from "./components/MonsterEditor";
import { PetSimulator } from "./components/PetSimulator";
import { TabNav, type Tab } from "./components/ui/TabNav";
import { PatchNotesModal } from "./components/PatchNotesModal";

function App() {
  const { t, i18n } = useTranslation();

  const tabs: Tab[] = [
    { id: "damage", label: t("tabs.damage"), shortLabel: t("tabs.damageShort"), icon: "⚔" },
    { id: "arena", label: t("tabs.arena"), icon: "🏟" },
    { id: "status", label: t("tabs.status"), shortLabel: t("tabs.statusShort"), icon: "✦" },
    { id: "pet", label: t("tabs.pet"), shortLabel: t("tabs.petShort"), icon: "🐾" },
    { id: "farm", label: t("tabs.farm"), shortLabel: t("tabs.farmShort"), icon: "♻" },
    { id: "monsters", label: t("tabs.monsters"), shortLabel: t("tabs.monstersShort"), icon: "📋" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    return tabs.find((t) => t.id === hash && !t.disabled)?.id ?? "damage";
  });
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Sync <html lang> with current language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-gradient-to-b from-white to-gray-100 border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl lg:max-w-[1400px] mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-indigo-900 tracking-wide whitespace-nowrap">⚔ OnceWorld Tools</h1>
            <div className="flex items-center gap-1.5">
              {/* Desktop: フィードバック・更新履歴を直接表示 */}
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf6NFySGmPNkQdFJEIwk11gtyvfiFVoJdwUVlwQ3MkN-vNHcg/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
              >
                {t("feedback")}
              </a>
              <button
                onClick={() => setShowPatchNotes(true)}
                className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
              >
                {t("patchNotes")}
              </button>

              {/* Mobile: ⋯ ドロップダウンメニュー */}
              <div ref={mobileMenuRef} className="relative sm:hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); setMobileMenuOpen((v) => !v); }}
                  className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                >
                  ⋯
                </button>
                {mobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSf6NFySGmPNkQdFJEIwk11gtyvfiFVoJdwUVlwQ3MkN-vNHcg/viewform?usp=dialog"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("feedback")}
                    </a>
                    <button
                      onClick={() => { setShowPatchNotes(true); setMobileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      {t("patchNotes")}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => i18n.changeLanguage(i18n.language === "ja" ? "en" : "ja")}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
              >
                {i18n.language === "ja" ? "JA" : "EN"}
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

      {/* メインコンテンツ */}
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
        <div className={activeTab === "pet" ? "" : "hidden"}>
          <PetSimulator />
        </div>
        <div className={activeTab === "monsters" ? "" : "hidden"}>
          <MonsterEditor />
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-auto py-3 text-center text-xs text-gray-400">
        <p>{t("footer")}</p>
      </footer>

      {showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}
    </div>
  );
}

export default App;
