-- Supabase Realtime Publication and Replica Identity Migration
-- Execute this script in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/ncxtkcykoftdxwtxqjlx/sql)

-- 1. Enable Realtime replication for existing database tables
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- 2. Set REPLICA IDENTITY FULL so DELETE and UPDATE events include full record data (e.g. userId)
ALTER TABLE invoices REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE expenses REPLICA IDENTITY FULL;
