-- RLSポリシーの修正
-- 匿名ユーザー（anon）でもINSERT/UPDATE/DELETEできるようにする

-- ============================================
-- monsters テーブルのポリシー修正
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated insert monsters" ON monsters;
DROP POLICY IF EXISTS "Allow authenticated update monsters" ON monsters;
DROP POLICY IF EXISTS "Allow authenticated delete monsters" ON monsters;

CREATE POLICY "Allow anon insert monsters" ON monsters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update monsters" ON monsters FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete monsters" ON monsters FOR DELETE USING (true);

-- ============================================
-- items テーブルのポリシー修正
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated insert items" ON items;
DROP POLICY IF EXISTS "Allow authenticated update items" ON items;
DROP POLICY IF EXISTS "Allow authenticated delete items" ON items;

CREATE POLICY "Allow anon insert items" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update items" ON items FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete items" ON items FOR DELETE USING (true);

-- ============================================
-- equipments テーブルのポリシー修正
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated insert equipments" ON equipments;
DROP POLICY IF EXISTS "Allow authenticated update equipments" ON equipments;
DROP POLICY IF EXISTS "Allow authenticated delete equipments" ON equipments;

CREATE POLICY "Allow anon insert equipments" ON equipments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update equipments" ON equipments FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete equipments" ON equipments FOR DELETE USING (true);

-- ============================================
-- magics テーブルのポリシー修正
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated insert magics" ON magics;
DROP POLICY IF EXISTS "Allow authenticated update magics" ON magics;
DROP POLICY IF EXISTS "Allow authenticated delete magics" ON magics;

CREATE POLICY "Allow anon insert magics" ON magics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update magics" ON magics FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete magics" ON magics FOR DELETE USING (true);

-- ============================================
-- pets テーブルのポリシー修正
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated insert pets" ON pets;
DROP POLICY IF EXISTS "Allow authenticated update pets" ON pets;
DROP POLICY IF EXISTS "Allow authenticated delete pets" ON pets;

CREATE POLICY "Allow anon insert pets" ON pets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update pets" ON pets FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete pets" ON pets FOR DELETE USING (true);

-- ============================================
-- update_logs テーブルのポリシー修正
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated read update_logs" ON update_logs;
DROP POLICY IF EXISTS "Allow authenticated insert update_logs" ON update_logs;

CREATE POLICY "Allow anon read update_logs" ON update_logs FOR SELECT USING (true);
CREATE POLICY "Allow anon insert update_logs" ON update_logs FOR INSERT WITH CHECK (true);
