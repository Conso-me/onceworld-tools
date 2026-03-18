import { useState, useEffect, useCallback } from "react";
import {
  getAllTemplates,
  getTemplatesEventName,
  type MonsterTemplate,
} from "../utils/monsterTemplateDB";

const EVENT = getTemplatesEventName();

/**
 * IndexedDB のモンスターテンプレート一覧をリアクティブに取得する。
 * `onceworld:templates-updated` イベントで自動同期（useAllMonsters パターン踏襲）。
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

  return { templates, loading, templateCount: templates.length };
}
