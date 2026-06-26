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

  // 外側クリックで閉じる（タッチ端末向け）
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

  // グループ本体クリック時に開き直すタブ（記憶 → 無効なら先頭の有効タブ）
  const resolveGroupTab = (group: TabGroup): Tab => {
    const remembered = group.tabs.find(
      (t) => t.id === lastByGroup[group.id] && !t.disabled,
    );
    return remembered ?? group.tabs.find((t) => !t.disabled) ?? group.tabs[0];
  };

  return (
    <div
      ref={navRef}
      className="flex gap-1 bg-gray-100 rounded-xl p-1"
      onMouseLeave={() => setOpenGroup(null)}
    >
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
              onMouseEnter={() => setOpenGroup(null)}
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
          <div
            key={group.id}
            className="relative flex-1"
            onMouseEnter={() => setOpenGroup(group.id)}
          >
            {/* ラベル部: 最後に開いていたタブへ直行 */}
            <button
              onClick={() => selectTab(resolveGroupTab(group), group.id)}
              className={`w-full pl-1 pr-6 sm:pl-4 sm:pr-7 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center ${
                isActiveGroup
                  ? "bg-white text-gray-800 shadow-sm"
                  : isOpen
                    ? "bg-white/70 text-gray-700"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {group.icon && <span className="mr-1">{group.icon}</span>}
              <span>{group.label}</span>
            </button>
            {/* ▾ : ドロップダウン開閉（タッチ端末で切替用） */}
            <button
              aria-label={`${group.label} を展開`}
              onClick={(e) => {
                e.stopPropagation();
                // ホバー(onMouseEnter)で開いた直後にトグルで閉じる競合や、
                // タッチ端末の擬似hoverを避けるため「開く」方向のみに固定。
                // 閉じるのは外側クリック / タブ選択 / マウス離脱で行う。
                setOpenGroup(group.id);
              }}
              className={`absolute right-0 top-1/2 -translate-y-1/2 h-full px-1.5 sm:px-2 flex items-center rounded-r-lg transition-colors ${
                isActiveGroup ? "text-gray-500" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span
                className={`text-[0.65em] opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>

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
