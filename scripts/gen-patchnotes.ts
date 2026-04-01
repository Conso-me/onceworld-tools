import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const DATA_PATH = resolve(import.meta.dirname, "../src/data/patchNotes.ts");

type ChangeType = "fix" | "feature" | "improve" | "feedback";

interface PatchChange {
  type: ChangeType;
  text: string;
}

interface PatchEntry {
  date: string;
  changes: PatchChange[];
}

function classifyChange(subject: string): ChangeType {
  if (/\[feedback\]/i.test(subject)) return "feedback";
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
    if (subject.startsWith("Merge pull request")) continue;
    if (subject.startsWith("Merge branch")) continue;
    if (/^chore(\(.+\))?:/.test(subject)) continue;

    const cleanSubject = subject.replace(/\[feedback\]\s*/i, "").trim();
    const change: PatchChange = { type: classifyChange(subject), text: cleanSubject };
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(change);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, changes]) => ({ date, changes }));
}

function getExistingTexts(content: string): Set<string> {
  const texts = new Set<string>();
  for (const match of content.matchAll(/text:\s*"((?:[^"\\]|\\.)*)"/g)) {
    texts.add(match[1].replace(/\\"/g, '"'));
  }
  // JSON.stringify形式（text: JSON.stringify(...)）の場合も対応
  for (const match of content.matchAll(/text:\s*"((?:[^"\\]|\\.)*)"/g)) {
    texts.add(JSON.parse(`"${match[1]}"`));
  }
  return texts;
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

function serializeChanges(changes: PatchChange[]): string {
  return changes
    .map((c) => `    { type: "${c.type}", text: ${JSON.stringify(c.text)} },`)
    .join("\n");
}

function main() {
  const existing = readFileSync(DATA_PATH, "utf-8");
  const existingDates = getExistingDates(existing);
  const existingTexts = getExistingTexts(existing);
  const gitEntries = getGitLog();

  // 日付ごとに新規コミットのみ抽出
  const newEntries: PatchEntry[] = [];
  const appendToExisting: PatchEntry[] = []; // 既存日付に追加するもの

  for (const entry of gitEntries) {
    const newChanges = entry.changes.filter(
      (c) => !existingTexts.has(c.text)
    );
    if (newChanges.length === 0) continue;

    if (existingDates.has(entry.date)) {
      appendToExisting.push({ date: entry.date, changes: newChanges });
    } else {
      newEntries.push({ date: entry.date, changes: newChanges });
    }
  }

  if (newEntries.length === 0 && appendToExisting.length === 0) {
    console.log("新規エントリなし。patchNotes.ts はそのままです。");
    return;
  }

  let updated = existing;

  // 既存日付への追記（その日付のchanges配列末尾に追加）
  for (const entry of appendToExisting) {
    const newLines = serializeChanges(entry.changes);
    // 該当日付のブロック内 changes: [ ... ] の閉じ括弧の直前に挿入
    updated = updated.replace(
      new RegExp(`(date:\\s*"${entry.date}"[^}]*?changes:\\s*\\[)([\\s\\S]*?)(\\s*\\],)`, "m"),
      (_, open, middle, close) => `${open}\n${newLines}${middle}${close}`
    );
  }

  const firstExistingDate = [...existingDates].sort().reverse()[0];
  const newerEntries = newEntries.filter((e) => e.date > (firstExistingDate ?? ""));
  const olderEntries = newEntries.filter((e) => e.date <= (firstExistingDate ?? ""));

  // 新しい日付のエントリは先頭に追加
  if (newerEntries.length > 0) {
    const newerBlocks = newerEntries.map(serializeEntry).join("\n") + "\n";
    updated = updated.replace(
      /export const patchNotes: PatchEntry\[\] = \[/,
      `export const patchNotes: PatchEntry[] = [\n${newerBlocks}`
    );
  }

  // 古い日付のエントリは末尾に追加
  if (olderEntries.length > 0) {
    const olderBlocks = "\n" + olderEntries.map(serializeEntry).join("\n");
    updated = updated.replace(/\n\];/, `${olderBlocks}\n];`);
  }

  writeFileSync(DATA_PATH, updated, "utf-8");

  const totalNew = newEntries.reduce((s, e) => s + e.changes.length, 0);
  const totalAppend = appendToExisting.reduce((s, e) => s + e.changes.length, 0);
  console.log(`${newEntries.length}件の新規日付エントリ、${appendToExisting.length}件の既存日付への追記を行いました`);
  console.log(`合計 ${totalNew + totalAppend} 件の変更を追加:`);
  for (const e of [...newEntries, ...appendToExisting]) {
    console.log(`  ${e.date} (${e.changes.length}件)`);
  }
}

main();
