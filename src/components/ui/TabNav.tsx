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

const LAST_KEY = (groupId: string) => `ow-nav-last-${groupId}`;

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
  // グループごとに最後に開いていたタブを記憶（localStorage に永続化）
  const [lastByGroup, setLastByGroup] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) {
      const stored = localStorage.getItem(LAST_KEY(g.id));
      const valid = stored && g.tabs.some((t) => t.id === stored && !t.disabled);
      init[g.id] = valid ? stored! : g.tabs[0].id;
      if (g.tabs.some((t) => t.id === activeTab)) init[g.id] = activeTab;
    }
    return init;
  });
  const navRef = useRef<HTMLDivElement>(null);

  const rememberGroupTab = (groupId: string, tabId: string) => {
    setLastByGroup((prev) => ({ ...prev, [groupId]: tabId }));
    try {
      localStorage.setItem(LAST_KEY(groupId), tabId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const found = allTabs.find((t) => t.id === hash && !t.disabled);
      if (found) {
        setActiveTab(found.id);
        onTabChange(found.id);
        const g = groups.find((g) => g.tabs.some((t) => t.id === found.id));
        if (g && g.tabs.length > 1) rememberGroupTab(g.id, found.id);
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

  const selectTab = (tab: Tab, groupId?: string) => {
    if (tab.disabled) return;
    setActiveTab(tab.id);
    window.location.hash = tab.id;
    onTabChange(tab.id);
    if (groupId) rememberGroupTab(groupId, tab.id);
    setOpenGroup(null);
  };

  // グループの右半分／クリック時に開くタブ（記憶 → 無効なら先頭の有効タブ）
  const resolveGroupTab = (group: TabGroup): Tab => {
    const remembered = group.tabs.find(
      (t) => t.id === lastByGroup[group.id] && !t.disabled,
    );
    return remembered ?? group.tabs.find((t) => !t.disabled) ?? group.tabs[0];
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
              {single.icon && <span className="hidden sm:inline sm:mr-1">{single.icon}</span>}
              <span className="sm:hidden">{single.shortLabel ?? single.label}</span>
              <span className="hidden sm:inline">{single.label}</span>
            </button>
          );
        }

        const lastTab = resolveGroupTab(group);
        const textColor = isActiveGroup ? "text-gray-800" : "text-gray-500";

        return (
          <div key={group.id} className="relative flex-1">
            <div
              className={`flex items-stretch rounded-lg overflow-hidden transition-all ${
                isActiveGroup
                  ? "bg-white shadow-sm"
                  : isOpen
                    ? "bg-white/70"
                    : ""
              }`}
            >
              {/* 左: カテゴリ → 一覧を開く（PCのみ） */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenGroup((v) => (v === group.id ? null : group.id));
                }}
                className={`hidden sm:flex items-center justify-center pl-3 pr-2 py-2 text-sm font-medium transition-colors whitespace-nowrap ${textColor} ${
                  isActiveGroup ? "" : "hover:text-gray-700"
                }`}
              >
                {group.icon && <span className="mr-1">{group.icon}</span>}
                <span>{group.label}</span>
                <span
                  className={`ml-0.5 text-[0.65em] opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>

              {/* 区切り（PCのみ） */}
              <span className="hidden sm:block w-px my-2 bg-gray-300/70" />

              {/* 右: 最後に開いたタブ → 1クリックで直行 */}
              <button
                onClick={() => selectTab(lastTab, group.id)}
                disabled={lastTab.disabled}
                title={lastTab.label}
                className={`flex-1 flex items-center justify-center pl-1 pr-4 sm:px-2 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${textColor} ${
                  isActiveGroup ? "" : "hover:text-gray-700"
                }`}
              >
                {lastTab.icon && <span className="mr-1">{lastTab.icon}</span>}
                <span className="sm:hidden">{lastTab.shortLabel ?? lastTab.label}</span>
                <span className="hidden sm:inline">{lastTab.label}</span>
              </button>

              {/* ▾: モバイルでの一覧展開（PCは左ボタンの▾を使う） */}
              <button
                aria-label={`${group.label} を展開`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenGroup((v) => (v === group.id ? null : group.id));
                }}
                className={`sm:hidden absolute right-0 top-0 h-full px-1.5 flex items-center ${textColor}`}
              >
                <span
                  className={`text-[0.65em] opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
            </div>

            {isOpen && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 min-w-[160px]">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab, group.id)}
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
