import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { usePersistedState } from "../hooks/usePersistedState";

export type Theme = "a" | "b";

/** 現状サポートしているテーマ。Theme B 追加時に "b" を足す。 */
const SUPPORTED_THEMES: Theme[] = ["a"];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** 切り替え可能なテーマ一覧 (1つだけならスイッチUIは出さない想定) */
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistedState<Theme>("theme", "a");

  // 未サポートのテーマが保存されていても A にフォールバック
  const theme: Theme = SUPPORTED_THEMES.includes(stored) ? stored : "a";

  // ルート要素に data-theme を反映 (CSS トークンの切替トリガー)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: setStored, themes: SUPPORTED_THEMES }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
