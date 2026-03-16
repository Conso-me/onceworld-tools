import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const DATA_PATH = resolve(import.meta.dirname, "../src/data/patchNotes.ts");

type ChangeType = "fix" | "feature" | "improve";

interface PatchChange {
  type: ChangeType;
  text: string;
}

interface PatchEntry {
  date: string;
  changes: PatchChange[];
}

function classifyChange(subject: string): ChangeType {
  if (/修正|バグ/.test(subject)) return "fix";
  if (/追加|実装|新規/.test(subject)) return "feature";
  return "improve";
}

function getGitLog(): PatchEntry[] {
  const raw = execSync('git log --pretty=format:"%ad|%s" --date=short', {
    encoding: "utf-8",
  });

  const grouped = new Map<string, PatchChange[]>();

  for (const line of raw.trim().split("\n")) {
    const [date, ...rest] = line.split("|");
    const subject = rest.join("|");
    if (!date || !subject) continue;
    if (subject.includes("[skip]")) continue;

    const change: PatchChange = { type: classifyChange(subject), text: subject };
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(change);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, changes]) => ({ date, changes }));
}

function getExistingDates(content: string): Set<string> {
  const dates = new Set<string>();
  for (const match of content.matchAll(/date:\s*"(\d{4}-\d{2}-\d{2})"/g)) {
    dates.add(match[1]);
  }
  return dates;
}

function serializeEntry(entry: PatchEntry): string {
  const changes = entry.changes
    .map((c) => `    { type: "${c.type}", text: ${JSON.stringify(c.text)} },`)
    .join("\n");
  return `  {\n    date: "${entry.date}",\n    changes: [\n${changes}\n    ],\n  },`;
}

function main() {
  const existing = readFileSync(DATA_PATH, "utf-8");
  const existingDates = getExistingDates(existing);
  const gitEntries = getGitLog();

  const newEntries = gitEntries.filter((e) => !existingDates.has(e.date));

  if (newEntries.length === 0) {
    console.log("新規エントリなし。patchNotes.ts はそのままです。");
    return;
  }

  // 既存エントリの日付を取得し、全エントリを日付降順でマージ
  // 既存エントリのうち最も古い日付より新しい新規エントリを先頭に追加
  const firstExistingDate = [...existingDates].sort().reverse()[0];

  // 既存エントリより新しいものと同じかそれ以前のものを分ける
  const newerEntries = newEntries.filter((e) => e.date > (firstExistingDate ?? ""));
  const olderEntries = newEntries.filter((e) => e.date <= (firstExistingDate ?? ""));

  let updated = existing;

  // 新しいエントリは先頭に追加
  if (newerEntries.length > 0) {
    const newerBlocks = newerEntries.map(serializeEntry).join("\n") + "\n";
    updated = updated.replace(
      /export const patchNotes: PatchEntry\[\] = \[/,
      `export const patchNotes: PatchEntry[] = [\n${newerBlocks}`
    );
  }

  // 古いエントリは末尾（];の直前）に追加
  if (olderEntries.length > 0) {
    // 日付昇順で末尾に追加（最も新しいものが先に来るよう降順にソート済み）
    const olderBlocks = "\n" + olderEntries.map(serializeEntry).join("\n");
    updated = updated.replace(/\n\];/, `${olderBlocks}\n];`);
  }

  writeFileSync(DATA_PATH, updated, "utf-8");
  console.log(`${newEntries.length}件の新規エントリを追加しました:`);
  for (const e of newEntries) {
    console.log(`  ${e.date} (${e.changes.length}件)`);
  }
}

main();
