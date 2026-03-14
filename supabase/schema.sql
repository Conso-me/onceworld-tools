-- OnceWorld Tools データベーススキーマ

-- ============================================
-- テーブル作成
-- ============================================

-- モンスターテーブル
CREATE TABLE IF NOT EXISTS monsters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level INTEGER,
    atk INTEGER,
    int INTEGER,
    attack_type VARCHAR(10) CHECK (attack_type IN ('物理', '魔法')),
    required_def INTEGER,
    required_mdef INTEGER,
    location TEXT,
    capture_rate VARCHAR(20),
    normal_drop VARCHAR(100),
    rare_drop VARCHAR(100),
    super_rare_drop VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アイテムテーブル
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- 素材, 消耗品, etc
    description TEXT,
    effects JSONB, -- 特殊効果をJSONで保存
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 装備テーブル
CREATE TABLE IF NOT EXISTS equipments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slot VARCHAR(20), -- 武器, 頭, 体, 手, 足, アクセサリー
    rarity VARCHAR(20), -- 通常, レア, 激レア, etc
    base_atk INTEGER DEFAULT 0,
    base_def INTEGER DEFAULT 0,
    base_m_def INTEGER DEFAULT 0,
    base_int INTEGER DEFAULT 0,
    base_hp INTEGER DEFAULT 0,
    base_mp INTEGER DEFAULT 0,
    effects JSONB, -- 特殊効果
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 魔法テーブル
CREATE TABLE IF NOT EXISTS magics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    element VARCHAR(20), -- 火, 水, 木, 光, 闇
    power INTEGER,
    mp_cost INTEGER,
    target VARCHAR(20), -- 単体, 全体, etc
    description TEXT,
    effects JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ペットテーブル
CREATE TABLE IF NOT EXISTS pets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    base_stats JSONB, -- {atk: 10, def: 5, ...}
    skills TEXT[], -- スキル名の配列
    evolve_from INTEGER REFERENCES pets(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- データ更新履歴テーブル（監査用）
CREATE TABLE IF NOT EXISTS update_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- インデックス作成
-- ============================================

CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
CREATE INDEX IF NOT EXISTS idx_monsters_level ON monsters(level);
CREATE INDEX IF NOT EXISTS idx_monsters_location ON monsters(location);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_equipments_slot ON equipments(slot);
CREATE INDEX IF NOT EXISTS idx_magics_element ON magics(element);
CREATE INDEX IF NOT EXISTS idx_update_logs_table_name ON update_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_update_logs_updated_at ON update_logs(updated_at);

-- ============================================
-- 更新日時自動更新関数
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルの更新トリガー
CREATE TRIGGER update_monsters_updated_at BEFORE UPDATE ON monsters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON equipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_magics_updated_at BEFORE UPDATE ON magics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- 各テーブルでRLSを有効化
ALTER TABLE monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE magics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（誰でも読める）
CREATE POLICY "Allow public read monsters" ON monsters FOR SELECT USING (true);
CREATE POLICY "Allow public read items" ON items FOR SELECT USING (true);
CREATE POLICY "Allow public read equipments" ON equipments FOR SELECT USING (true);
CREATE POLICY "Allow public read magics" ON magics FOR SELECT USING (true);
CREATE POLICY "Allow public read pets" ON pets FOR SELECT USING (true);

-- 書き込みポリシー（認証済みユーザーのみ）
CREATE POLICY "Allow authenticated insert monsters" ON monsters FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update monsters" ON monsters FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete monsters" ON monsters FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert items" ON items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update items" ON items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete items" ON items FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert equipments" ON equipments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update equipments" ON equipments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete equipments" ON equipments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert magics" ON magics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update magics" ON magics FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete magics" ON magics FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert pets" ON pets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update pets" ON pets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete pets" ON pets FOR DELETE USING (auth.role() = 'authenticated');

-- update_logsは認証済みユーザーのみ読み書き可能
CREATE POLICY "Allow authenticated read update_logs" ON update_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert update_logs" ON update_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 更新履歴記録関数
-- ============================================

CREATE OR REPLACE FUNCTION log_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO update_logs (table_name, record_id, action, old_data, updated_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO update_logs (table_name, record_id, action, old_data, new_data, updated_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO update_logs (table_name, record_id, action, new_data, updated_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新履歴トリガー
CREATE TRIGGER monsters_update_log AFTER INSERT OR UPDATE OR DELETE ON monsters
    FOR EACH ROW EXECUTE FUNCTION log_update();
CREATE TRIGGER items_update_log AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION log_update();
CREATE TRIGGER equipments_update_log AFTER INSERT OR UPDATE OR DELETE ON equipments
    FOR EACH ROW EXECUTE FUNCTION log_update();
CREATE TRIGGER magics_update_log AFTER INSERT OR UPDATE OR DELETE ON magics
    FOR EACH ROW EXECUTE FUNCTION log_update();
CREATE TRIGGER pets_update_log AFTER INSERT OR UPDATE OR DELETE ON pets
    FOR EACH ROW EXECUTE FUNCTION log_update();
