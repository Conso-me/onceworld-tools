/**
 * Google Sheets からフィードバックを取得し GitHub Issues に変換するスクリプト
 *
 * 使用方法:
 * 1. Google Cloud Console でサービスアカウントを作成し、Sheets API を有効化
 * 2. .env.local に以下を設定:
 *    GOOGLE_SERVICE_ACCOUNT_KEY=<サービスアカウント JSON の中身>
 *    SHEETS_FEEDBACK_ID=<スプレッドシート ID>
 *    GH_TOKEN=<GitHub PAT>
 *    GH_REPO_OWNER=<オーナー名>
 *    GH_REPO_NAME=<リポジトリ名>
 * 3. npx tsx scripts/fetch-feedback.ts
 *
 * Google Sheets の列構成:
 *   A: タイムスタンプ
 *   B: フィードバック種別（バグ報告 / 改善提案 / その他）
 *   C: 関連ツール
 *   D: 内容（Issue タイトル）
 *   E: 詳細（Issue 本文、任意）
 *   F: 処理済み（スクリプトが "done" を書き込む）
 */

import { google } from 'googleapis';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local を読み込む
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('Loaded .env.local');
  } catch {
    console.log('Note: .env.local not found, using environment variables');
  }
}

loadEnv();

// 環境変数チェック
const REQUIRED_VARS = ['GOOGLE_SERVICE_ACCOUNT_KEY', 'SHEETS_FEEDBACK_ID', 'GH_TOKEN', 'GH_REPO_OWNER', 'GH_REPO_NAME'];
for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`Error: ${key} environment variable is required`);
    process.exit(1);
  }
}

const SHEETS_ID = process.env.SHEETS_FEEDBACK_ID!;
const REPO_OWNER = process.env.GH_REPO_OWNER!;
const REPO_NAME = process.env.GH_REPO_NAME!;

// Google Sheets API クライアント初期化（サービスアカウント認証）
function createSheetsClient() {
  const keyJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// GitHub API クライアント初期化
const octokit = new Octokit({ auth: process.env.GH_TOKEN });

interface FeedbackRow {
  rowIndex: number; // Sheets の行番号（1-indexed、ヘッダー込み）
  timestamp: string;
  kind: string;    // バグ報告 / 改善提案 / その他
  tool: string;    // 関連ツール
  title: string;   // Issue タイトル
  body: string;    // Issue 本文
}

// 未処理フィードバックを Sheets から取得
async function fetchUnprocessedFeedback(sheets: ReturnType<typeof createSheetsClient>): Promise<FeedbackRow[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range: 'A:F',
  });

  const rows = res.data.values ?? [];
  const feedback: FeedbackRow[] = [];

  // 行 1 はヘッダーなのでスキップ（row index は 1-indexed）
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const processed = row[5]?.trim() ?? '';
    if (processed === 'done') continue;

    const title = row[3]?.trim() ?? '';
    if (!title) continue; // タイトルが空の行はスキップ

    feedback.push({
      rowIndex: i + 1, // Sheets は 1-indexed
      timestamp: row[0]?.trim() ?? '',
      kind: row[1]?.trim() ?? '',
      tool: row[2]?.trim() ?? '',
      title,
      body: row[4]?.trim() ?? '',
    });
  }

  console.log(`Found ${feedback.length} unprocessed feedback entries`);
  return feedback;
}

// open な Issue 一覧を取得
async function fetchOpenIssues() {
  const issues: Array<{ number: number; title: string; body: string | null }> = [];
  let page = 1;

  while (true) {
    const res = await octokit.issues.listForRepo({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'open',
      per_page: 100,
      page,
    });
    issues.push(...res.data.map(i => ({ number: i.number, title: i.title, body: i.body ?? '' })));
    if (res.data.length < 100) break;
    page++;
  }

  console.log(`Fetched ${issues.length} open issues`);
  return issues;
}

// キーワードマッチで重複 Issue を検索（3 キーワード以上共通で重複判定）
function findDuplicateIssue(
  feedback: FeedbackRow,
  issues: Array<{ number: number; title: string; body: string | null }>
): number | null {
  const feedbackText = `${feedback.title} ${feedback.body}`;
  const keywords = feedbackText
    .split(/[\s　、。・,.!?！？「」【】（）()[\]]+/)
    .map(k => k.trim())
    .filter(k => k.length >= 2); // 2 文字以上のトークンのみ

  if (keywords.length === 0) return null;

  for (const issue of issues) {
    const issueText = `${issue.title} ${issue.body ?? ''}`;
    const matched = keywords.filter(kw => issueText.includes(kw));
    if (matched.length >= 3) {
      return issue.number;
    }
  }
  return null;
}

// 新規 Issue を作成
async function createIssue(feedback: FeedbackRow): Promise<{ number: number; url: string }> {
  const labels = ['feedback'];
  if (feedback.kind === 'バグ報告') labels.push('bug');
  if (feedback.kind === '改善提案') labels.push('enhancement');

  const body = [
    feedback.body ? `## 詳細\n${feedback.body}` : '',
    `---`,
    `**種別:** ${feedback.kind || '未指定'}`,
    `**関連ツール:** ${feedback.tool || '未指定'}`,
    `**受信日時:** ${feedback.timestamp}`,
    `*このIssueはフィードバックフォームから自動生成されました*`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const res = await octokit.issues.create({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    title: feedback.title,
    body,
    labels,
  });

  console.log(`  Created issue #${res.data.number}: ${feedback.title}`);
  return { number: res.data.number, url: res.data.html_url };
}

// Discord に新規 Issue を通知
async function notifyDiscord(feedback: FeedbackRow, issueNumber: number, issueUrl: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const kindEmoji = feedback.kind === 'バグ報告' ? '🐛' : feedback.kind === '改善提案' ? '✨' : '💬';
  const color = feedback.kind === 'バグ報告' ? 0xe74c3c : feedback.kind === '改善提案' ? 0x2ecc71 : 0x3498db;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `${kindEmoji} ${feedback.title}`,
        url: issueUrl,
        color,
        fields: [
          { name: '種別', value: feedback.kind || '未指定', inline: true },
          { name: '関連ツール', value: feedback.tool || '未指定', inline: true },
        ],
        footer: { text: `Issue #${issueNumber} • OnceWorld Tools フィードバック` },
        timestamp: new Date().toISOString(),
      }],
    }),
  });

  console.log(`  Notified Discord for issue #${issueNumber}`);
}

// 既存 Issue にコメントを追加
async function addComment(issueNumber: number, feedback: FeedbackRow): Promise<void> {
  const body = [
    `## 類似フィードバック`,
    feedback.body ? feedback.body : '（詳細なし）',
    `---`,
    `**種別:** ${feedback.kind || '未指定'}`,
    `**関連ツール:** ${feedback.tool || '未指定'}`,
    `**受信日時:** ${feedback.timestamp}`,
    `*このコメントはフィードバックフォームから自動追加されました*`,
  ].join('\n\n');

  await octokit.issues.createComment({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: issueNumber,
    body,
  });

  console.log(`  Added comment to issue #${issueNumber}: ${feedback.title}`);
}

// Sheets の処理済み列に "done" を書き込む
async function markAsDone(
  sheets: ReturnType<typeof createSheetsClient>,
  rowIndex: number
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_ID,
    range: `F${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['done']] },
  });
}

async function main() {
  console.log('=== fetch-feedback.ts ===\n');

  const sheets = createSheetsClient();

  const [feedbackList, openIssues] = await Promise.all([
    fetchUnprocessedFeedback(sheets),
    fetchOpenIssues(),
  ]);

  if (feedbackList.length === 0) {
    console.log('No unprocessed feedback. Exiting.');
    return;
  }

  for (const feedback of feedbackList) {
    console.log(`\nProcessing: "${feedback.title}"`);
    try {
      const duplicateNumber = findDuplicateIssue(feedback, openIssues);

      if (duplicateNumber !== null) {
        console.log(`  Duplicate detected → commenting on #${duplicateNumber}`);
        await addComment(duplicateNumber, feedback);
      } else {
        const { number, url } = await createIssue(feedback);
        await notifyDiscord(feedback, number, url);
      }

      await markAsDone(sheets, feedback.rowIndex);
    } catch (err) {
      console.error(`  Error processing feedback at row ${feedback.rowIndex}:`, err);
      // エラーが出ても他のフィードバックは処理を続ける
    }
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
