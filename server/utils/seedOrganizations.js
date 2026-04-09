const supabase = require('./supabase');

async function seedOrganizationsIfEmpty() {
  const defaults = [
    {
      name: 'Municipal Sanitation Department',
      type: 'department',
      categories: ['garbage', 'drainage'],
      contacts: { emails: [], phones: [], whatsappNumbers: [] },
      coverage: { cities: [], pincodes: [] },
      is_active: true
    },
    {
      name: 'Public Works Department (PWD)',
      type: 'department',
      categories: ['pothole', 'road_damage'],
      contacts: { emails: [], phones: [], whatsappNumbers: [] },
      coverage: { cities: [], pincodes: [] },
      is_active: true
    },
    {
      name: 'Water Supply Department',
      type: 'department',
      categories: ['water_leakage'],
      contacts: { emails: [], phones: [], whatsappNumbers: [] },
      coverage: { cities: [], pincodes: [] },
      is_active: true
    },
    {
      name: 'Electricity / Streetlight Department',
      type: 'department',
      categories: ['streetlight'],
      contacts: { emails: [], phones: [], whatsappNumbers: [] },
      coverage: { cities: [], pincodes: [] },
      is_active: true
    },
    {
      name: 'Local Civic NGO Network',
      type: 'ngo',
      categories: ['other'],
      contacts: { emails: [], phones: [], whatsappNumbers: [] },
      coverage: { cities: [], pincodes: [] },
      is_active: true
    }
  ];

  try {
    const { data: existing } = await supabase
      .from('organizations')
      .select('name')
      .in('name', defaults.map(d => d.name));

    const existingNames = new Set((existing || []).map(o => o.name));
    const toInsert = defaults.filter(d => !existingNames.has(d.name));

    if (toInsert.length === 0) return;

    const { error } = await supabase.from('organizations').insert(toInsert);
    if (error) {
      console.error('⚠️ Seed organizations error:', error.message);
    } else {
      console.log(`✅ Seeded ${toInsert.length} default organizations`);
    }
  } catch (err) {
    console.error('⚠️ Seed organizations error:', err.message);
  }
}

module.exports = {
  seedOrganizationsIfEmpty
};
