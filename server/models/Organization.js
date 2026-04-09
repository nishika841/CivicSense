const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['department', 'ngo'],
    default: 'department'
  },
  categories: [{
    type: String,
    enum: ['pothole', 'garbage', 'water_leakage', 'streetlight', 'drainage', 'road_damage', 'other']
  }],
  contacts: {
    emails: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    phones: [{
      type: String,
      trim: true
    }],
    whatsappNumbers: [{
      type: String,
      trim: true
    }]
  },
  coverage: {
    cities: [{
      type: String,
      trim: true
    }],
    pincodes: [{
      type: String,
      trim: true
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

organizationSchema.index({ isActive: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ categories: 1 });
organizationSchema.index({ 'coverage.cities': 1 });
organizationSchema.index({ 'coverage.pincodes': 1 });

module.exports = mongoose.model('Organization', organizationSchema);
