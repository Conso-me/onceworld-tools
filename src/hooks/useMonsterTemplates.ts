import { useState, useEffect, useCallback } from "react";
import {
  getAllTemplates,
  getTemplatesEventName,
  type MonsterTemplate,
} from "../utils/monsterTemplateDB";
import staticTemplates from "../../docs/data/monsterTemplates.json";

const EVENT = getTemplatesEventName();

/**
 * IndexedDB のモンスターテンプレート一覧をリアクティブに取得する。
 * `onceworld:templates-updated` イベントで自動同期（useAllMonsters パターン踏襲）。
 * templateCount は静的テンプレートとカスタムテンプレートのマージ後の件数。
 */
export function useMonsterTemplates() {
  const [templates, setTemplates] = useState<MonsterTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const all = await getAllTemplates();
      setTemplates(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const handler = () => { reload(); };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [reload]);

  // マージ後の総テンプレート数（静的 + カスタム、同名はカスタム優先）
  const customNames = new Set(templates.map((t) => t.name));
  const staticCount = (staticTemplates as { name: string }[]).filter(
    (t) => !customNames.has(t.name),
  ).length;
  const templateCount = staticCount + templates.length;

  return { templates, loading, templateCount };
}
