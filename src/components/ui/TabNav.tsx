import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface Tab {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: string;
  disabled?: boolean;
  overflow?: boolean;  // true のタブは「⋯」ドロップダウンに格納
}

export function TabNav({
  tabs,
  onTabChange,
}: {
  tabs: Tab[];
  onTabChange: (tabId: string) => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    const found = tabs.find((t) => t.id === hash && !t.disabled);
    return found ? found.id : tabs[0].id;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const found = tabs.find((t) => t.id === hash && !t.disabled);
      if (found) {
        setActiveTab(found.id);
        onTabChange(found.id);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [tabs, onTabChange]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [dropdownOpen]);

  const handleClick = (tab: Tab) => {
    if (tab.disabled) return;
    setActiveTab(tab.id);
    window.location.hash = tab.id;
    onTabChange(tab.id);
    setDropdownOpen(false);
  };

  const mainTabs = tabs.filter((t) => !t.overflow);
  const overflowTabs = tabs.filter((t) => t.overflow);
  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);

  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {mainTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab)}
          disabled={tab.disabled}
          className={`flex-1 px-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? "bg-white text-gray-800 shadow-sm"
              : tab.disabled
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.icon && <span className="mr-1">{tab.icon}</span>}
          <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
          <span className="hidden sm:inline">{tab.label}</span>
          {tab.disabled && (
            <span className="ml-1 text-xs text-gray-300">{t("preparing")}</span>
          )}
        </button>
      ))}

      {overflowTabs.length > 0 && (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v); }}
            className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              isOverflowActive
                ? "bg-white text-gray-800 shadow-sm"
                : dropdownOpen
                  ? "bg-white/70 text-gray-700"
                  : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {isOverflowActive
              ? (() => {
                  const active = overflowTabs.find((t) => t.id === activeTab)!;
                  return (
                    <>
                      {active.icon && <span className="mr-1">{active.icon}</span>}
                      <span className="sm:hidden">{active.shortLabel ?? active.label}</span>
                      <span className="hidden sm:inline">{active.label}</span>
                    </>
                  );
                })()
              : "⋯"}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 min-w-[140px]">
              {overflowTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleClick(tab)}
                  disabled={tab.disabled}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    activeTab === tab.id
                      ? "text-gray-800 font-semibold bg-gray-50"
                      : tab.disabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
                  {tab.label}
                  {tab.disabled && (
                    <span className="ml-1 text-xs text-gray-300">{t("preparing")}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
