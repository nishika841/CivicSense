const mongoose = require('mongoose');
const Organization = require('../models/Organization');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicsense';
  await mongoose.connect(mongoUri);

  const updates = [
    { name: 'Municipal Sanitation Department', email: 'sanitation@example.com', phone: '+911111111111', whatsapp: '+911111111111' },
    { name: 'Public Works Department (PWD)', email: 'pwd@example.com', phone: '+922222222222', whatsapp: '+922222222222' },
    { name: 'Water Supply Department', email: 'water@example.com', phone: '+933333333333', whatsapp: '+933333333333' },
    { name: 'Electricity / Streetlight Department', email: 'streetlight@example.com', phone: '+944444444444', whatsapp: '+944444444444' },
    { name: 'Local Civic NGO Network', email: 'ngo@example.com', phone: '+955555555555', whatsapp: '+955555555555' }
  ];

  for (const u of updates) {
    await Organization.updateMany(
      { name: u.name },
      {
        $set: {
          'contacts.emails': [u.email],
          'contacts.phones': [u.phone],
          'contacts.whatsappNumbers': [u.whatsapp],
          isActive: true
        }
      }
    );
  }

  const sample = await Organization.find({ name: { $in: updates.map((u) => u.name) } })
    .select('name contacts.emails')
    .lean();

  console.log(sample);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
