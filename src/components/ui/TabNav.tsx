import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface Tab {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: string;
  disabled?: boolean;
}

export interface TabGroup {
  id: string;
  label: string;
  icon?: string;
  tabs: Tab[];
}

export function TabNav({
  groups,
  onTabChange,
}: {
  groups: TabGroup[];
  onTabChange: (tabId: string) => void;
}) {
  const { t } = useTranslation();
  const allTabs = groups.flatMap((g) => g.tabs);

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    const found = allTabs.find((t) => t.id === hash && !t.disabled);
    return found ? found.id : allTabs[0].id;
  });
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const found = allTabs.find((t) => t.id === hash && !t.disabled);
      if (found) {
        setActiveTab(found.id);
        onTabChange(found.id);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [allTabs, onTabChange]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!openGroup) return;
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openGroup]);

  const selectTab = (tab: Tab) => {
    if (tab.disabled) return;
    setActiveTab(tab.id);
    window.location.hash = tab.id;
    onTabChange(tab.id);
    setOpenGroup(null);
  };

  return (
    <div ref={navRef} className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {groups.map((group) => {
        const isActiveGroup = group.tabs.some((t) => t.id === activeTab);
        const isOpen = openGroup === group.id;
        // 単一タブのグループはドロップダウンせず直接タブとして扱う
        const single = group.tabs.length === 1 ? group.tabs[0] : null;

        if (single) {
          return (
            <button
              key={group.id}
              onClick={() => selectTab(single)}
              disabled={single.disabled}
              className={`flex-1 px-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === single.id
                  ? "bg-white text-gray-800 shadow-sm"
                  : single.disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {single.icon && <span className="mr-1">{single.icon}</span>}
              <span className="sm:hidden">{single.shortLabel ?? single.label}</span>
              <span className="hidden sm:inline">{single.label}</span>
            </button>
          );
        }

        return (
          <div key={group.id} className="relative flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenGroup((v) => (v === group.id ? null : group.id));
              }}
              className={`w-full px-1 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center ${
                isActiveGroup
                  ? "bg-white text-gray-800 shadow-sm"
                  : isOpen
                    ? "bg-white/70 text-gray-700"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {group.icon && <span className="sm:mr-1">{group.icon}</span>}
              <span className="hidden sm:inline">{group.label}</span>
              <span
                className={`ml-0.5 text-[0.65em] opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 min-w-[160px]">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab)}
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
        );
      })}
    </div>
  );
}
