-- This SQL script fixes RLS policies for proper tenant isolation

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

-- Create proper tenant isolation policies
CREATE POLICY tenant_isolation_locations ON locations
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_services ON services
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_employees ON employees
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_schedules ON schedules
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_appointments ON appointments
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_users ON users
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_api_keys ON api_keys
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY tenant_isolation_webhooks ON webhooks
    TO authenticated
    USING (tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Special case for the join table - we enforce tenant isolation via the employees table
CREATE POLICY tenant_isolation_emp_loc ON employee_locations
    TO authenticated
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE tenant_id::text = coalesce(current_setting('app.tenant_id', true), current_setting('request.jwt.claims', true)::json->>'tenant_id')
        )
    );

-- Create a special admin access policy (only if you need admin access)
CREATE OR REPLACE FUNCTION is_system_admin() 
RETURNS BOOLEAN AS $$
DECLARE
    claims json;
BEGIN
    -- Check for admin flag or special system role
    BEGIN
        claims := current_setting('request.jwt.claims', true)::json;
        RETURN claims->>'role' = 'system_admin';
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies that allow system admins to bypass tenant isolation
CREATE POLICY admin_all_locations ON locations 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_services ON services 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_employees ON employees 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_schedules ON schedules 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_appointments ON appointments 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_users ON users 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_api_keys ON api_keys 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_webhooks ON webhooks 
    TO authenticated 
    USING (is_system_admin());

CREATE POLICY admin_all_emp_loc ON employee_locations 
    TO authenticated 
    USING (is_system_admin());