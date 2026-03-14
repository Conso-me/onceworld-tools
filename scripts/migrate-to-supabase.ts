/**
 * JSONデータをSupabaseに移行するスクリプト
 *
 * 使用方法:
 * 1. npm install @supabase/supabase-js
 * 2. npx tsx scripts/migrate-to-supabase.ts
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
    console.log('Error:', error);
  }
}

loadEnv();

// Supabaseクライアント初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required');
  console.error('Please set them in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface MonsterJson {
  headers: string[];
  rows: string[][];
}

async function migrateMonsters() {
  console.log('Migrating monsters...');

  const jsonPath = path.join(__dirname, '../docs/wiki/json/モンスター.json');
  const jsonData: MonsterJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const monsters = [];
  for (const table of jsonData) {
    const nameIndex = table.headers.indexOf('モンスター名');
    const locationIndex = table.headers.indexOf('主な出現場所');
    const normalDropIndex = table.headers.indexOf('通常ドロップ');
    const rareDropIndex = table.headers.indexOf('レアドロップ');
    const superRareDropIndex = table.headers.indexOf('激レアドロップ');
    const captureRateIndex = table.headers.indexOf('捕獲率');

    for (const row of table.rows) {
      monsters.push({
        name: row[nameIndex] || '',
        location: row[locationIndex] || null,
        normal_drop: row[normalDropIndex] || null,
        rare_drop: row[rareDropIndex] || null,
        super_rare_drop: row[superRareDropIndex] || null,
        capture_rate: row[captureRateIndex] || null,
        level: null,
        atk: null,
        int: null,
        attack_type: null,
        required_def: null,
        required_mdef: null,
      });
    }
  }

  // バッチ挿入（100件ずつ）
  const batchSize = 100;
  for (let i = 0; i < monsters.length; i += batchSize) {
    const batch = monsters.slice(i, i + batchSize);
    const { error } = await supabase.from('monsters').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log(`Total monsters migrated: ${monsters.length}`);
}

async function migrateItems() {
  console.log('Migrating items...');

  const jsonPath = path.join(__dirname, '../docs/wiki/json/素材.json');
  const jsonData: MonsterJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const items = [];
  for (const table of jsonData) {
    const nameIndex = table.headers.indexOf('アイテム名');
    const categoryIndex = table.headers.indexOf('カテゴリ');

    for (const row of table.rows) {
      items.push({
        name: row[nameIndex] || '',
        category: row[categoryIndex] || '素材',
        description: null,
        effects: null,
      });
    }
  }

  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await supabase.from('items').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log(`Total items migrated: ${items.length}`);
}

async function migrateEquipments() {
  console.log('Migrating equipments...');

  const jsonPath = path.join(__dirname, '../docs/wiki/json/装備.json');
  const jsonData: MonsterJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const equipments = [];
  for (const table of jsonData) {
    const nameIndex = table.headers.indexOf('装備名');
    const slotIndex = table.headers.indexOf('部位');

    for (const row of table.rows) {
      equipments.push({
        name: row[nameIndex] || '',
        slot: row[slotIndex] || null,
        rarity: null,
        base_atk: null,
        base_def: null,
        base_m_def: null,
        base_int: null,
        base_hp: null,
        base_mp: null,
        effects: null,
      });
    }
  }

  const batchSize = 100;
  for (let i = 0; i < equipments.length; i += batchSize) {
    const batch = equipments.slice(i, i + batchSize);
    const { error } = await supabase.from('equipments').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log(`Total equipments migrated: ${equipments.length}`);
}

async function migrateMagics() {
  console.log('Migrating magics...');

  const jsonPath = path.join(__dirname, '../docs/wiki/json/魔法.json');
  const jsonData: MonsterJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const magics = [];
  for (const table of jsonData) {
    const nameIndex = table.headers.indexOf('魔法名');
    const elementIndex = table.headers.indexOf('属性');

    for (const row of table.rows) {
      magics.push({
        name: row[nameIndex] || '',
        element: row[elementIndex] || null,
        power: null,
        mp_cost: null,
        target: null,
        description: null,
        effects: null,
      });
    }
  }

  const batchSize = 100;
  for (let i = 0; i < magics.length; i += batchSize) {
    const batch = magics.slice(i, i + batchSize);
    const { error } = await supabase.from('magics').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log(`Total magics migrated: ${magics.length}`);
}

async function migratePets() {
  console.log('Migrating pets...');

  const jsonPath = path.join(__dirname, '../docs/wiki/json/ペット.json');
  const jsonData: MonsterJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const pets = [];
  for (const table of jsonData) {
    // ペット.jsonのヘッダーは「モンスター名」になっている
    const nameIndex = table.headers.indexOf('モンスター名');

    for (const row of table.rows) {
      pets.push({
        name: row[nameIndex] || '',
        type: null,
        base_stats: null,
        skills: null,
        evolve_from: null,
        description: null,
      });
    }
  }

  const batchSize = 100;
  for (let i = 0; i < pets.length; i += batchSize) {
    const batch = pets.slice(i, i + batchSize);
    const { error } = await supabase.from('pets').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }

  console.log(`Total pets migrated: ${pets.length}`);
}

async function main() {
  console.log('Starting migration...\n');

  try {
    await migrateMonsters();
    await migrateItems();
    await migrateEquipments();
    await migrateMagics();
    await migratePets();

    console.log('\nMigration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
