-- Supabase Migration SQL
-- Generated from Prisma schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables with appropriate constraints and RLS policies

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    notification_email TEXT,
    subdomain TEXT UNIQUE NOT NULL,
    custom_domain TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'TRIAL',
    plan TEXT NOT NULL DEFAULT 'FREE',
    trial_ends_at TIMESTAMPTZ,
    settings JSONB,
    branding JSONB,
    features JSONB NOT NULL,
    api_key TEXT UNIQUE,
    webhook_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes on tenant table
CREATE INDEX IF NOT EXISTS tenants_subdomain_idx ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS tenants_custom_domain_idx ON tenants(custom_domain);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email, tenant_id)
);

CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_tenant_id_idx ON api_keys(tenant_id);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhooks_tenant_id_idx ON webhooks(tenant_id);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS locations_tenant_id_idx ON locations(tenant_id);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_tenant_id_idx ON services(tenant_id);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employees_tenant_id_idx ON employees(tenant_id);

-- Employee Locations join table
CREATE TABLE IF NOT EXISTS employee_locations (
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (employee_id, location_id)
);

CREATE INDEX IF NOT EXISTS employee_locations_employee_id_idx ON employee_locations(employee_id);
CREATE INDEX IF NOT EXISTS employee_locations_location_id_idx ON employee_locations(location_id);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    weekday TEXT NOT NULL,
    block_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedules_tenant_id_idx ON schedules(tenant_id);
CREATE INDEX IF NOT EXISTS schedules_emp_loc_weekday_idx ON schedules(employee_id, location_id, weekday);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    canceled_by TEXT,
    cancel_reason TEXT,
    fulfillment_date TIMESTAMPTZ,
    payment_status TEXT,
    payment_amount REAL,
    booked_by TEXT NOT NULL,
    booked_by_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_tenant_id_idx ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS appointments_emp_start_status_idx ON appointments(employee_id, start_time, status);
CREATE INDEX IF NOT EXISTS appointments_loc_start_status_idx ON appointments(location_id, start_time, status);
CREATE INDEX IF NOT EXISTS appointments_userid_start_idx ON appointments(user_id, start_time);

-- Add trigger for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at column
CREATE TRIGGER update_tenants_modtime
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_api_keys_modtime
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_webhooks_modtime
BEFORE UPDATE ON webhooks
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_locations_modtime
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_services_modtime
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_employees_modtime
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_schedules_modtime
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_appointments_modtime
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security Policies --

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

-- Create function to set the tenant context (for testing and service role operations)
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Set the tenant ID in the current session
    PERFORM set_config('app.tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create tenant_id function to extract from JWT
CREATE OR REPLACE FUNCTION get_tenant_id_from_jwt()
RETURNS UUID AS $$
DECLARE
    tenant_claim text;
    tenant_id UUID;
BEGIN
    -- First check for explicit tenant context setting
    BEGIN
        tenant_claim := current_setting('app.tenant_id', true);
        IF tenant_claim IS NOT NULL THEN
            -- Verify it's a valid UUID
            BEGIN
                tenant_id := tenant_claim::UUID;
                RETURN tenant_id;
            EXCEPTION WHEN OTHERS THEN
                -- Fall through to JWT check if not valid UUID
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Fall through to JWT check
    END;
    
    -- Try to get tenant_id from JWT claims
    tenant_claim := current_setting('request.jwt.claims', true)::json->>'tenant_id';
    
    IF tenant_claim IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Verify it's a valid UUID
    BEGIN
        tenant_id := tenant_claim::UUID;
        RETURN tenant_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    claims json;
    perms json;
BEGIN
    -- Get the JWT claims
    claims := current_setting('request.jwt.claims', true)::json;
    
    -- Check if role is admin directly
    IF claims->>'role' = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if permissions array contains admin
    perms := claims->'permissions';
    IF perms IS NOT NULL AND json_typeof(perms) = 'array' THEN
        -- Check if 'admin' is in the permissions array
        FOR i IN 0..json_array_length(perms)-1 LOOP
            IF perms->>i = 'admin' THEN
                RETURN TRUE;
            END IF;
        END LOOP;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenant policies
CREATE POLICY tenant_admin_all ON tenants
    TO authenticated
    USING (is_admin());

-- For each tenant table, create appropriate RLS policies
CREATE POLICY tenant_isolation_users ON users
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_api_keys ON api_keys
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_webhooks ON webhooks
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_locations ON locations
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_services ON services
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_employees ON employees
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_emp_loc ON employee_locations
    TO authenticated
    USING (
        employee_id IN (SELECT id FROM employees WHERE tenant_id = get_tenant_id_from_jwt()) OR
        is_admin()
    );

CREATE POLICY tenant_isolation_schedules ON schedules
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

CREATE POLICY tenant_isolation_appointments ON appointments
    TO authenticated
    USING (tenant_id = get_tenant_id_from_jwt() OR is_admin());

-- Create policies for anonymous access (if needed)
CREATE POLICY anon_read_services ON services
    FOR SELECT
    TO anon
    USING (tenant_id IN (
        SELECT id FROM tenants WHERE status = 'ACTIVE' AND subdomain = current_setting('app.subdomain', true)
    ));

-- Allow anon to see active locations
CREATE POLICY anon_read_locations ON locations
    FOR SELECT
    TO anon
    USING (tenant_id IN (
        SELECT id FROM tenants WHERE status = 'ACTIVE' AND subdomain = current_setting('app.subdomain', true)
    ));

-- Create bucket for tenant uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-uploads', 'Tenant Uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage
CREATE POLICY tenant_storage_policy ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'tenant-uploads' AND 
        (storage.foldername(name))[1] = get_tenant_id_from_jwt()::text
    );