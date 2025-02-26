# Migrating to Supabase

This guide covers migrating our scheduling API from PostgreSQL + Prisma to Supabase.

## Step 1: Set Up Supabase Project

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project:
   - Choose a name (e.g., "scheduling-api")
   - Set a secure database password
   - Choose a region close to your users
   - Select the free plan (or paid if needed)

3. Once your project is created, grab the API credentials from Settings > API:
   - `SUPABASE_URL`: The project URL (e.g., `https://abcdefghijklm.supabase.co`)
   - `SUPABASE_ANON_KEY`: The anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: The service_role key (keep this secure!)

4. Add these credentials to your `.env` file:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Step 2: Apply Database Schema

1. Open the SQL Editor in the Supabase dashboard
2. Create a new query
3. Copy the entire contents of `supabase-migration.sql` into the editor
4. Run the query to set up the database schema

## Step 3: Set Up Row Level Security (RLS)

Supabase uses RLS to enforce tenant isolation:

1. All tables in `supabase-migration.sql` already have RLS policies defined
2. Make sure RLS is enabled for all tables (it is by default)
3. The policies use the JWT claims to extract the tenant ID
4. Authentication should include the tenant_id in the JWT claims

## Step 4: Configure Supabase Auth

1. Go to Auth > Settings in the Supabase dashboard
2. Configure JWT format to match your needs:
   - Set up any custom claims you need (especially tenant_id)

3. For Auth0 integration:
   - Enable "JWT Authorization"
   - Set the JWT secret to match your Auth0 secret
   - Configure Auth0 to include tenant_id in the token

## Step 5: Configure Storage Bucket

1. Go to Storage in the Supabase dashboard
2. You should see a bucket called "tenant-uploads" created by the migration SQL
3. Verify its settings:
   - Public access enabled
   - RLS policies in place

## Step 6: Import Existing Data

1. Export your existing data from PostgreSQL:
   ```bash
   pg_dump -t tenants -t locations -t employees -t services -t schedules -t appointments -t employee_locations --data-only --column-inserts -U your_username your_database > data_export.sql
   ```

2. Edit the exported SQL file to fix any syntax differences

3. Import the data to Supabase:
   - Use the SQL Editor to run the modified export file

## Step 7: Test the Migration

Before fully switching, run both systems in parallel:

1. Update your code to use the new Supabase client files
2. Create a test endpoint that uses Supabase
3. Compare results between old and new systems
4. Run specific tests against the Supabase version

## Step 8: Switch Over

Once testing confirms everything works correctly:

1. Update the remaining code to use Supabase
2. Check all API endpoints work correctly
3. Verify tenant isolation is enforced properly
4. Monitor error logs closely after switchover

## Step 9: Migrate File Storage

1. Download all files from your current storage system
2. Upload each file to the Supabase "tenant-uploads" bucket:
   ```js
   const { uploadTenantFile } = require('./src/lib/supabase');
   
   // For each file:
   const fs = require('fs');
   const fileBuffer = fs.readFileSync(filePath);
   const tenantId = '...'; // The tenant ID
   const fileName = '...'; // Original file name
   const contentType = '...'; // MIME type
   
   await uploadTenantFile(tenantId, fileBuffer, fileName, contentType);
   ```

3. Update any file URLs in the database to point to the new Supabase storage

## Next Steps

After migrating to Supabase, you can explore:

1. Using Supabase realtime subscriptions for live updates
2. Leveraging Supabase Edge Functions for serverless operations
3. Migrating to NestJS for a more structured backend architecture
4. Setting up CI/CD with Supabase preview branches

## Troubleshooting

Common issues and solutions:

- **RLS Policy Issues**: Make sure you're setting the tenant context properly with `setTenantContext()` before database operations
- **JWT Issues**: Verify token format matches what Supabase expects
- **Access Denied**: Check that users have the correct roles and permissions
- **Missing Tenant ID**: Ensure tenant_id is properly included in the JWT claims
- **Storage Access**: Verify the RLS policies for the storage bucket

For more help, refer to:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord community: https://discord.supabase.com