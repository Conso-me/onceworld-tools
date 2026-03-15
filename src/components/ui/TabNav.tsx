import { useState, useEffect } from "react";

export interface Tab {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: string;
  disabled?: boolean;
}

export function TabNav({
  tabs,
  onTabChange,
}: {
  tabs: Tab[];
  onTabChange: (tabId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    const found = tabs.find((t) => t.id === hash && !t.disabled);
    return found ? found.id : tabs[0].id;
  });

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

  const handleClick = (tab: Tab) => {
    if (tab.disabled) return;
    setActiveTab(tab.id);
    window.location.hash = tab.id;
    onTabChange(tab.id);
  };

  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {tabs.map((tab) => (
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
            <span className="ml-1 text-xs text-gray-300">準備中</span>
          )}
        </button>
      ))}
    </div>
  );
}
