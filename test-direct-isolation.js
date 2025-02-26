/**
 * Direct Database Connection Test for Tenant Isolation
 * 
 * This test uses pg directly to:
 * 1. Enable RLS properly
 * 2. Set app.tenant_id directly
 * 3. Test tenant isolation
 */

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

// Directly use the database password from .env
let connectionString = process.env.DIRECT_DB_URL;

// If not set, try to extract from Supabase URL
if (!connectionString) {
  console.log(`Using Supabase URL: ${process.env.SUPABASE_URL}`);
  // Get database URL from Supabase connection string
  const supabaseUrl = process.env.SUPABASE_URL || '';
  // Extract project reference from supabase URL (e.g., hviohvnfoeybrpfkhyms)
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    throw new Error('Could not extract project reference from Supabase URL. Format should be https://your-project-ref.supabase.co');
  }
  
  console.log(`Extracted project ref: ${projectRef}`);
  connectionString = `postgres://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;
}

console.log(`Using connection string (password hidden): ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

// Create a new PostgreSQL pool
const pool = new Pool({ connectionString });

async function runQuery(query, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

// Generate a random name to avoid collisions
const generateName = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const generateId = () => crypto.randomUUID();

async function testIsolation() {
  console.log('===== DIRECT DATABASE TENANT ISOLATION TEST =====');
  
  const tenant1Id = generateId();
  const tenant2Id = generateId();
  
  try {
    // First, check if tables exist and RLS is enabled
    const tableCheck = await runQuery(`
      SELECT table_name, row_level_security 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'locations'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.error('Error: locations table does not exist');
      return;
    }
    
    console.log(`RLS enabled on locations table: ${tableCheck.rows[0].row_level_security}`);
    
    // Drop all existing policies on locations table
    await runQuery(`
      DO $$ 
      DECLARE 
        pol text;
      BEGIN
        FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'locations') 
        LOOP
          EXECUTE 'DROP POLICY IF EXISTS ' || pol || ' ON locations';
        END LOOP;
      END $$;
    `);
    console.log('Dropped existing policies on locations table');
    
    // Make sure RLS is enabled
    await runQuery('ALTER TABLE locations ENABLE ROW LEVEL SECURITY');
    console.log('Enabled RLS on locations table');
    
    // Create new policy for tenant isolation
    await runQuery(`
      CREATE POLICY tenant_isolation ON locations
      FOR ALL
      TO PUBLIC
      USING (tenant_id::text = current_setting('app.tenant_id', true))
    `);
    console.log('Created tenant isolation policy');
    
    // Create the first tenant
    await runQuery(`
      INSERT INTO tenants (id, name, subdomain, status, plan, features)
      VALUES ($1, $2, $3, 'ACTIVE', 'PRO', '{"locations":true}')
    `, [tenant1Id, 'Test Tenant 1', generateName('test1')]);
    console.log(`Created tenant 1 with ID: ${tenant1Id}`);
    
    // Create the second tenant
    await runQuery(`
      INSERT INTO tenants (id, name, subdomain, status, plan, features)
      VALUES ($1, $2, $3, 'ACTIVE', 'PRO', '{"locations":true}')
    `, [tenant2Id, 'Test Tenant 2', generateName('test2')]);
    console.log(`Created tenant 2 with ID: ${tenant2Id}`);
    
    // Set tenant context to tenant 1
    await runQuery(`SELECT set_config('app.tenant_id', $1, false)`, [tenant1Id]);
    console.log(`Set context to tenant 1: ${tenant1Id}`);
    
    // Create a location for tenant 1
    await runQuery(`
      INSERT INTO locations (id, tenant_id, name, address)
      VALUES ($1, $2, $3, '123 Test St')
    `, [generateId(), tenant1Id, 'Location 1']);
    console.log('Created location for tenant 1');
    
    // Set tenant context to tenant 2
    await runQuery(`SELECT set_config('app.tenant_id', $1, false)`, [tenant2Id]);
    console.log(`Set context to tenant 2: ${tenant2Id}`);
    
    // Create a location for tenant 2
    await runQuery(`
      INSERT INTO locations (id, tenant_id, name, address)
      VALUES ($1, $2, $3, '456 Test Ave')
    `, [generateId(), tenant2Id, 'Location 2']);
    console.log('Created location for tenant 2');
    
    // Check tenant 2's view
    const tenant2Locations = await runQuery(`SELECT id, name, tenant_id FROM locations`);
    console.log(`Tenant 2 sees ${tenant2Locations.rows.length} locations:`, 
      tenant2Locations.rows.map(l => `${l.name} (${l.tenant_id})`));
    
    // Set tenant context back to tenant 1
    await runQuery(`SELECT set_config('app.tenant_id', $1, false)`, [tenant1Id]);
    console.log(`Set context back to tenant 1: ${tenant1Id}`);
    
    // Check tenant 1's view
    const tenant1Locations = await runQuery(`SELECT id, name, tenant_id FROM locations`);
    console.log(`Tenant 1 sees ${tenant1Locations.rows.length} locations:`, 
      tenant1Locations.rows.map(l => `${l.name} (${l.tenant_id})`));
    
    // Verify isolation
    const leakFound = tenant1Locations.rows.some(l => l.tenant_id === tenant2Id);
    if (leakFound) {
      console.error('❌ ISOLATION FAILED: Tenant 1 can see Tenant 2 data');
    } else {
      console.log('✅ ISOLATION SUCCESS: Tenant 1 cannot see Tenant 2 data');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nCleaning up...');
    
    // Clean up
    await runQuery(`DELETE FROM locations WHERE tenant_id IN ($1, $2)`, [tenant1Id, tenant2Id]);
    await runQuery(`DELETE FROM tenants WHERE id IN ($1, $2)`, [tenant1Id, tenant2Id]);
    console.log('Deleted test data');
    
    // Close the pool
    await pool.end();
  }
}

// Run the test
testIsolation().catch(console.error);