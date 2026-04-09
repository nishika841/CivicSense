const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['pothole', 'garbage', 'water_leakage', 'streetlight', 'drainage', 'road_damage', 'other']
  },
  city: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      default: 'Unknown location'
    }
  },
  images: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['Reported', 'Verified', 'InProgress', 'Resolved'],
    default: 'Reported'
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  impactScore: {
    type: Number,
    default: 0
  },
  progressImages: [{
    type: String
  }],
  resolutionImages: [{
    type: String
  }],
  statusHistory: [{
    status: String,
    timestamp: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  blockchainHash: {
    type: String
  },
  transactionId: {
    type: String
  },
  blockNumber: {
    type: Number
  },
  resolutionHash: {
    type: String
  },
  resolutionTransactionId: {
    type: String
  },
  onChain: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ city: 1 });
complaintSchema.index({ pincode: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ impactScore: -1 });

complaintSchema.methods.calculateImpactScore = function() {
  const daysPending = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  this.impactScore = this.votes * (daysPending + 1);
  return this.impactScore;
};

module.exports = mongoose.model('Complaint', complaintSchema);
