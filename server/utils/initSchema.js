const supabase = require('./supabase');

const SCHEMA_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'org_user')),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'department' CHECK (type IN ('department', 'ngo')),
  categories JSONB NOT NULL DEFAULT '[]',
  contacts JSONB NOT NULL DEFAULT '{"emails":[],"phones":[],"whatsappNumbers":[]}',
  coverage JSONB NOT NULL DEFAULT '{"cities":[],"pincodes":[]}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK for users.organization_id after organizations table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_organization'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_organization
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pothole','garbage','water_leakage','streetlight','drainage','road_damage','other')),
  city TEXT,
  pincode TEXT,
  location_lng DOUBLE PRECISION,
  location_lat DOUBLE PRECISION,
  location_address TEXT DEFAULT 'Unknown location',
  images JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported','Verified','InProgress','Resolved','Confirmed')),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  votes INTEGER NOT NULL DEFAULT 0,
  impact_score INTEGER NOT NULL DEFAULT 0,
  progress_images JSONB NOT NULL DEFAULT '[]',
  resolution_images JSONB NOT NULL DEFAULT '[]',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  blockchain_hash TEXT,
  transaction_id TEXT,
  block_number INTEGER,
  resolution_hash TEXT,
  resolution_transaction_id TEXT,
  confirmed_at TIMESTAMPTZ,
  confirm_transaction_id TEXT,
  on_chain BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Complaint voters junction table
CREATE TABLE IF NOT EXISTS complaint_voters (
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (complaint_id, user_id)
);

-- Status history table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped','acknowledged','accepted','in_progress','resolved')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','hi')),
  tone TEXT NOT NULL DEFAULT 'formal' CHECK (tone IN ('formal','neutral')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT DEFAULT '',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp')),
  provider TEXT NOT NULL DEFAULT 'none' CHECK (provider IN ('smtp','twilio','none')),
  to_address TEXT NOT NULL,
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  template JSONB NOT NULL DEFAULT '{"id":"","language":"en","tone":"formal"}',
  success BOOLEAN NOT NULL DEFAULT false,
  provider_message_id TEXT DEFAULT '',
  error TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_city ON complaints(city);
CREATE INDEX IF NOT EXISTS idx_complaints_pincode ON complaints(pincode);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_impact_score ON complaints(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comments_complaint ON comments(complaint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_complaint ON status_history(complaint_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_complaint ON assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_assignments_org ON assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_assignment ON notification_logs(assignment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON notification_logs(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
`;

async function initSchema() {
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: SCHEMA_SQL });
        if (error) {
            // If the RPC doesn't exist, try creating tables via individual queries
            // This is a fallback — we'll use the REST API approach
            console.log('ℹ️  RPC exec_sql not available, creating tables via REST...');
            await createTablesViaRest();
            return;
        }
        console.log('✅ Supabase schema initialized');
    } catch (err) {
        console.log('ℹ️  Attempting table creation via REST API...');
        await createTablesViaRest();
    }
}

async function createTablesViaRest() {
    // Use the Supabase Management API or just check if tables exist
    // by doing a simple select. If tables don't exist, we'll guide the user.
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error && error.code === '42P01') {
            // Table doesn't exist
            console.error('⚠️  Tables do not exist yet.');
            console.error('📋 Please run the SQL schema in Supabase Dashboard → SQL Editor.');
            console.error('   The SQL file is at: server/utils/schema.sql');
            await writeSchemaFile();
            process.exit(1);
        } else {
            console.log('✅ Supabase tables already exist');
        }
    } catch (err) {
        console.error('⚠️  Could not verify Supabase tables:', err.message);
    }
}

async function writeSchemaFile() {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    fs.writeFileSync(schemaPath, SCHEMA_SQL, 'utf8');
    console.log(`📄 Schema SQL written to: ${schemaPath}`);
}

// Export the raw SQL too so we can write it to a file
module.exports = { initSchema, SCHEMA_SQL };
