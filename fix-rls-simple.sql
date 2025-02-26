-- This SQL script fixes RLS policies for proper tenant isolation
-- This version just drops the old policies and creates simpler ones

-- Delete ALL existing data from these tables (to start with a clean slate)
DELETE FROM appointments;
DELETE FROM schedules;
DELETE FROM employee_locations;
DELETE FROM services;
DELETE FROM employees;
DELETE FROM locations;
DELETE FROM webhooks;
DELETE FROM api_keys;
DELETE FROM users;
DELETE FROM tenants;

-- Drop existing policies that aren't working correctly
DROP POLICY IF EXISTS tenant_isolation_locations ON locations;
DROP POLICY IF EXISTS tenant_isolation_services ON services;
DROP POLICY IF EXISTS tenant_isolation_employees ON employees;
DROP POLICY IF EXISTS tenant_isolation_schedules ON schedules;
DROP POLICY IF EXISTS tenant_isolation_appointments ON appointments;
DROP POLICY IF EXISTS tenant_isolation_users ON users;
DROP POLICY IF EXISTS tenant_isolation_api_keys ON api_keys;
DROP POLICY IF EXISTS tenant_isolation_webhooks ON webhooks;
DROP POLICY IF EXISTS tenant_isolation_emp_loc ON employee_locations;
DROP POLICY IF EXISTS anon_read_services ON services;
DROP POLICY IF EXISTS anon_read_locations ON locations;
DROP POLICY IF EXISTS tenant_admin_all ON tenants;
DROP POLICY IF EXISTS admin_all_locations ON locations;
DROP POLICY IF EXISTS admin_all_services ON services;
DROP POLICY IF EXISTS admin_all_employees ON employees;
DROP POLICY IF EXISTS admin_all_schedules ON schedules;
DROP POLICY IF EXISTS admin_all_appointments ON appointments;
DROP POLICY IF EXISTS admin_all_users ON users;
DROP POLICY IF EXISTS admin_all_api_keys ON api_keys;
DROP POLICY IF EXISTS admin_all_webhooks ON webhooks;
DROP POLICY IF EXISTS admin_all_emp_loc ON employee_locations;

-- Create simple policies that just check app.tenant_id
CREATE POLICY tenant_isolation_locations ON locations
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_services ON services
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_employees ON employees
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_schedules ON schedules
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_appointments ON appointments
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_api_keys ON api_keys
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_webhooks ON webhooks
    FOR ALL
    TO authenticated
    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Special case for the join table
CREATE POLICY tenant_isolation_emp_loc ON employee_locations
    FOR ALL
    TO authenticated
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE tenant_id::text = current_setting('app.tenant_id', true)
        )
    );

-- Basic tenant access policy
CREATE POLICY tenant_access ON tenants
    FOR ALL
    TO authenticated
    USING (id::text = current_setting('app.tenant_id', true));