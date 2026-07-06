-- Enable Row Level Security (RLS) on all user-data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- POLICIES FOR 'users' TABLE (column: uid)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own profile"
ON users FOR SELECT
USING (auth.uid() = uid);

CREATE POLICY "Allow users to insert/update their own profile"
ON users FOR ALL
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

-- ----------------------------------------------------
-- POLICIES FOR 'invoices' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own invoices"
ON invoices FOR SELECT
USING (auth.uid() = userId);

CREATE POLICY "Allow users to manage their own invoices"
ON invoices FOR ALL
USING (auth.uid() = userId)
WITH CHECK (auth.uid() = userId);

-- ----------------------------------------------------
-- POLICIES FOR 'clients' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own clients"
ON clients FOR SELECT
USING (auth.uid() = userId);

CREATE POLICY "Allow users to manage their own clients"
ON clients FOR ALL
USING (auth.uid() = userId)
WITH CHECK (auth.uid() = userId);

-- ----------------------------------------------------
-- POLICIES FOR 'expenses' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own expenses"
ON expenses FOR SELECT
USING (auth.uid() = userId);

CREATE POLICY "Allow users to manage their own expenses"
ON expenses FOR ALL
USING (auth.uid() = userId)
WITH CHECK (auth.uid() = userId);

-- ----------------------------------------------------
-- POLICIES FOR 'preset_items' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own presets"
ON preset_items FOR SELECT
USING (auth.uid() = userId);

CREATE POLICY "Allow users to manage their own presets"
ON preset_items FOR ALL
USING (auth.uid() = userId)
WITH CHECK (auth.uid() = userId);
