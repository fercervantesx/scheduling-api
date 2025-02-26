-- Add the tenant_id setting function
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Set the tenant ID in the current session
    PERFORM set_config('app.tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_tenant_id_from_jwt function to check app.tenant_id first
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

-- Fix the is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    claims json;
    perms json;
BEGIN
    -- Get the JWT claims
    BEGIN
        claims := current_setting('request.jwt.claims', true)::json;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
    
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