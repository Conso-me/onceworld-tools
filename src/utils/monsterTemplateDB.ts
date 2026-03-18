/**
 * IndexedDB によるモンスターテンプレート（アイコンハッシュ）の永続化。
 *
 * DB名: onceworld-tools / ストア名: monsterTemplates
 * keyPath: name（モンスター名で一意）
 */

export interface MonsterTemplate {
  name: string;
  hash: string; // bigint→hex文字列
  imageDataUrl: string; // 48×48サムネイル (data:image/png;base64,...)
  registeredAt: number; // Date.now()
}

const DB_NAME = "onceworld-tools";
const STORE_NAME = "monsterTemplates";
const DB_VERSION = 1;

const TEMPLATES_EVENT = "onceworld:templates-updated";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTemplate(template: MonsterTemplate): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await txPromise(tx.objectStore(STORE_NAME).put(template));
  db.close();
  window.dispatchEvent(new CustomEvent(TEMPLATES_EVENT));
}

export async function saveTemplates(templates: MonsterTemplate[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const t of templates) {
    store.put(t);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new CustomEvent(TEMPLATES_EVENT));
}

export async function getAllTemplates(): Promise<MonsterTemplate[]> {
  const db = await openDB();
  const result = await txPromise(
    db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll(),
  );
  db.close();
  return result;
}

export async function deleteTemplate(name: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await txPromise(tx.objectStore(STORE_NAME).delete(name));
  db.close();
  window.dispatchEvent(new CustomEvent(TEMPLATES_EVENT));
}

export async function clearAllTemplates(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await txPromise(tx.objectStore(STORE_NAME).clear());
  db.close();
  window.dispatchEvent(new CustomEvent(TEMPLATES_EVENT));
}

export function getTemplatesEventName(): string {
  return TEMPLATES_EVENT;
}

// ── マイグレーション ─────────────────────────────────────────────────────

const MIGRATION_FLAG = "onceworld:templates-migrated";

/**
 * 初回のみ: 組み込みモンスター名と一致するIndexedDBテンプレートを削除する。
 * 静的JSONテンプレートが代替するため、カスタムモンスター名のみ保持する。
 */
export async function migrateBuiltinTemplates(
  isBuiltin: (name: string) => boolean,
): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  const templates = await getAllTemplates();
  const builtinNames = templates
    .filter((t) => isBuiltin(t.name))
    .map((t) => t.name);

  if (builtinNames.length > 0) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const name of builtinNames) {
      store.delete(name);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    console.log(`[migration] Removed ${builtinNames.length} builtin templates from IndexedDB`);
  }

  localStorage.setItem(MIGRATION_FLAG, "1");
}

// ── エクスポート / インポート ─────────────────────────────────────────────

interface ExportData {
  version: 1;
  exportedAt: number;
  templates: MonsterTemplate[];
}

export async function exportTemplates(): Promise<string> {
  const templates = await getAllTemplates();
  const data: ExportData = { version: 1, exportedAt: Date.now(), templates };
  return JSON.stringify(data);
}

export async function importTemplates(json: string): Promise<number> {
  const data = JSON.parse(json) as ExportData;
  if (!data.templates || !Array.isArray(data.templates)) {
    throw new Error("無効なファイル形式です");
  }
  await saveTemplates(data.templates);
  return data.templates.length;
}
