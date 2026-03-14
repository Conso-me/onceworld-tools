/**
 * Google Sheetsからデータを取得してSupabaseにインポートするスクリプト
 *
 * 使用方法:
 * 1. Google Sheets APIキーを取得（Google Cloud Console）
 * 2. .env.local に VITE_GOOGLE_SHEETS_API_KEY を設定
 * 3. npx tsx scripts/import-from-sheets.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.localファイルを読み込む
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('Loaded .env.local file');
  } catch (error) {
    console.log('Note: .env.local file not found or could not be read');
  }
}

loadEnv();

// Supabaseクライアント初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Google Sheets設定
const SHEET_ID = '1HCdxir-t7O6FmUMFSWr0h9dQKPWUJgRI0yFbzZmeVIQ';
const API_KEY = process.env.VITE_GOOGLE_SHEETS_API_KEY;

// シート名と範囲の定義
const SHEETS = {
  monsters: {
    name: 'ステータス計算',
    range: 'A25:K200', // 敵データの範囲（適宜調整）
  },
  pets: {
    name: 'ペット基礎値',
    range: 'A1:Z100',
  },
  items: {
    name: 'アイテム一覧',
    range: 'A1:Z100',
  },
  equipments: {
    name: 'アクセ基礎値',
    range: 'A1:Z100',
  },
};

async function fetchSheetData(sheetName: string, range: string): Promise<any[][]> {
  if (!API_KEY) {
    console.error('Error: VITE_GOOGLE_SHEETS_API_KEY is required');
    console.error('Please set it in your .env.local file');
    process.exit(1);
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}!${range}?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`Error fetching ${sheetName}:`, error);
    return [];
  }
}

async function importMonsters() {
  console.log('Importing monsters from Google Sheets...');
  
  const values = await fetchSheetData(SHEETS.monsters.name, SHEETS.monsters.range);
  if (values.length === 0) {
    console.log('No data found in monsters sheet');
    return;
  }

  // ヘッダー行を取得
  const headers = values[0];
  console.log('Headers:', headers);

  // データ行を処理
  const monsters = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0] || row[0].trim() === '') continue; // 空行をスキップ

    const monster = {
      name: row[0]?.trim() || '',
      level: parseInt(row[1]) || null,
      attack_type: row[2] === '物理' ? '物理' : row[2] === '魔法' ? '魔法' : null,
      vit: parseInt(row[3]?.replace(/,/g, '')) || null,
      spd: parseInt(row[4]?.replace(/,/g, '')) || null,
      atk: parseInt(row[5]?.replace(/,/g, '')) || null,
      int: parseInt(row[6]?.replace(/,/g, '')) || null,
      def: parseInt(row[7]?.replace(/,/g, '')) || null,
      required_mdef: parseInt(row[8]?.replace(/,/g, '')) || null,
      luk: parseInt(row[9]?.replace(/,/g, '')) || null,
    };

    if (monster.name && monster.name !== '敵ステータス') {
      monsters.push(monster);
    }
  }

  console.log(`Found ${monsters.length} monsters`);

  // Supabaseに挿入
  const batchSize = 100;
  for (let i = 0; i < monsters.length; i += batchSize) {
    const batch = monsters.slice(i, i + batchSize);
    const { error } = await supabase.from('monsters').upsert(batch, {
      onConflict: 'name',
    });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log(`Total monsters imported: ${monsters.length}`);
}

async function importPets() {
  console.log('Importing pets from Google Sheets...');
  
  const values = await fetchSheetData(SHEETS.pets.name, SHEETS.pets.range);
  if (values.length === 0) {
    console.log('No data found in pets sheet');
    return;
  }

  console.log('Pets sheet headers:', values[0]);
  // TODO: ペットデータのパース処理を実装
}

async function importItems() {
  console.log('Importing items from Google Sheets...');
  
  const values = await fetchSheetData(SHEETS.items.name, SHEETS.items.range);
  if (values.length === 0) {
    console.log('No data found in items sheet');
    return;
  }

  console.log('Items sheet headers:', values[0]);
  // TODO: アイテムデータのパース処理を実装
}

async function main() {
  console.log('Starting import from Google Sheets...\n');

  try {
    await importMonsters();
    await importPets();
    await importItems();

    console.log('\nImport completed!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
