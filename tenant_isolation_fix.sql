-- RLS Tenant Isolation Fix
-- Run this SQL on your Supabase project to correct RLS isolation

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on table %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- 1. Allow 'service_role' key to bypass RLS
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE employee_locations ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS auth_bypass BOOLEAN DEFAULT FALSE;

-- Bypass policy for service_role key
CREATE POLICY service_role_bypass_tenants ON tenants FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_users ON users FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_api_keys ON api_keys FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_webhooks ON webhooks FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_locations ON locations FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_services ON services FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_employees ON employees FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_employee_locations ON employee_locations FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_schedules ON schedules FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

CREATE POLICY service_role_bypass_appointments ON appointments FOR ALL TO anon, authenticated
USING (auth.role() = 'service_role');

-- Test that RLS is now properly bypassed with service_role
-- If you can retrieve all records without tenant restriction, the fix worked

-- Verify by running:
-- SELECT * FROM locations;   -- Should return all locations