require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createAdmin() {
  // Delete old admin if exists
  await supabase.from('users').delete().eq('email', 'admin@civicsense.io');

  // Hash password properly
  const hash = await bcrypt.hash('Admin@123', 12);
  console.log('Hash generated:', hash);

  // Insert admin user
  const { data, error } = await supabase.from('users').insert({
    name: 'Admin',
    email: 'admin@civicsense.io',
    password_hash: hash,
    role: 'admin'
  }).select('id, name, email, role').single();

  if (error) {
    console.error('ERROR:', error.message);
  } else {
    console.log('SUCCESS:', JSON.stringify(data, null, 2));
  }

  // Verify by reading back
  const { data: verify } = await supabase.from('users').select('password_hash').eq('email', 'admin@civicsense.io').single();
  console.log('Stored hash:', verify.password_hash);
  console.log('Hash matches:', await bcrypt.compare('Admin@123', verify.password_hash));
}

createAdmin();
