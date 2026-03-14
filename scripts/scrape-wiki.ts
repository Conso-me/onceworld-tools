import axios from "axios";
import TurndownService from "turndown";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://wikiwiki.jp/onceworld/";

// 取得対象ページ
const PAGES = [
  "ステータス",
  "モンスター",
  "ペット",
  "装備",
  "アクセサリー",
  "魔法",
  "素材",
  "転生",
];

const RAW_DIR = path.join(__dirname, "../docs/wiki/raw");
const JSON_DIR = path.join(__dirname, "../docs/wiki/json");

interface TableData {
  headers: string[];
  rows: string[][];
}

async function ensureDirectories() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(JSON_DIR, { recursive: true });
}

function cleanDocument(document: Document): void {
  // 不要な要素を削除
  const selectorsToRemove = [
    "script",
    "style",
    "noscript",
    "iframe",
    ".advertisement",
    ".ad",
    "#pc-caption-ad-container",
    "#pc-bottom-parent-ad-container",
    "#inbound-ad-container",
    "#pc-overlay-ad-parent-container",
    "[id*='ad-container']",
    "[class*='advertisement']",
  ];

  selectorsToRemove.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  });
}

function extractTables(document: Document): TableData[] {
  const tables: TableData[] = [];
  const tableElements = document.querySelectorAll("#body table");

  tableElements.forEach((table) => {
    const headers: string[] = [];
    const rows: string[][] = [];

    // 最初の行をヘッダーとして取得
    const firstRow = table.querySelector("tr");
    if (firstRow) {
      const headerCells = firstRow.querySelectorAll("th, td");
      headerCells.forEach((cell) => {
        headers.push((cell as HTMLElement).textContent?.trim() || "");
      });
    }

    // データ行を取得（最初の行以降）
    const allRows = table.querySelectorAll("tr");
    allRows.forEach((row, index) => {
      if (index === 0) return; // ヘッダー行はスキップ

      const cells = row.querySelectorAll("td, th");
      if (cells.length > 0) {
        const rowData: string[] = [];
        cells.forEach((cell) => {
          rowData.push((cell as HTMLElement).textContent?.trim() || "");
        });
        rows.push(rowData);
      }
    });

    if (headers.length > 0 && rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  return tables;
}

async function scrapePage(pageName: string): Promise<void> {
  const url = `${BASE_URL}${encodeURIComponent(pageName)}`;
  console.log(`Scraping: ${pageName} (${url})`);

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      timeout: 30000,
    });

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // 不要な要素を削除
    cleanDocument(document);

    // テーブルデータを抽出
    const tables = extractTables(document);

    // メインコンテンツのHTMLを取得
    const body = document.querySelector("#body");
    const contentHtml = body ? body.innerHTML : "";

    // HTMLをマークダウンに変換
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    // 不要なリンク属性を除去
    turndownService.addRule("cleanLinks", {
      filter: "a",
      replacement: function (content, node) {
        const href = (node as HTMLAnchorElement).getAttribute("href");
        if (!href || href.startsWith("javascript:") || href.includes("::cmd/edit")) {
          return content;
        }
        // 相対リンクを絶対リンクに変換
        const absoluteHref = href.startsWith("/")
          ? `https://wikiwiki.jp${href}`
          : href;
        return `[${content}](${absoluteHref})`;
      },
    });

    // テーブルのカスタム変換ルール（turndown-plugin-gfm風）
    turndownService.addRule("tableCell", {
      filter: ["th", "td"],
      replacement: function (content) {
        return content.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
      },
    });

    turndownService.addRule("tableRow", {
      filter: "tr",
      replacement: function (content, node) {
        const cells = (node as Element).querySelectorAll("th, td");
        const cellContents: string[] = [];
        cells.forEach((cell) => {
          cellContents.push((cell.textContent || "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim());
        });
        return "| " + cellContents.join(" | ") + " |\n";
      },
    });

    turndownService.addRule("table", {
      filter: "table",
      replacement: function (content) {
        // コンテンツから行を抽出
        const lines = content.trim().split("\n").filter((line) => line.startsWith("|"));
        if (lines.length === 0) return "";

        // 最初の行の後にヘッダー区切りを追加
        const firstLine = lines[0];
        const columnCount = (firstLine.match(/\|/g) || []).length - 1;
        const separator = "| " + Array(columnCount).fill("---").join(" | ") + " |";

        return "\n\n" + lines[0] + "\n" + separator + "\n" + lines.slice(1).join("\n") + "\n\n";
      },
    });

    const markdown = `# ${pageName}\n\nSource: ${url}\n\n${turndownService.turndown(contentHtml)}`;

    // マークダウンを保存
    const mdFilename = `${pageName}.md`;
    await fs.writeFile(path.join(RAW_DIR, mdFilename), markdown, "utf-8");
    console.log(`  Saved: ${mdFilename}`);

    // テーブルデータをJSONで保存
    if (tables.length > 0) {
      const jsonFilename = `${pageName}.json`;
      await fs.writeFile(
        path.join(JSON_DIR, jsonFilename),
        JSON.stringify(tables, null, 2),
        "utf-8"
      );
      console.log(`  Saved: ${jsonFilename} (${tables.length} tables)`);
    } else {
      console.log(`  No tables found`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `  Error scraping ${pageName}: ${error.response?.status} ${error.message}`
      );
    } else {
      console.error(`  Error scraping ${pageName}:`, error);
    }
  }
}

async function main() {
  console.log("OnceWorld Wiki Scraper");
  console.log("======================\n");

  await ensureDirectories();

  for (const pageName of PAGES) {
    await scrapePage(pageName);
    // レート制限対策（2秒待機）
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\nDone!");
}

main().catch(console.error);
