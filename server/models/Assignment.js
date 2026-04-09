const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'whatsapp'],
    default: 'email'
  },
  status: {
    type: String,
    enum: [
      'queued',
      'sent',
      'failed',
      'skipped',
      'acknowledged',
      'accepted',
      'in_progress',
      'resolved'
    ],
    default: 'queued'
  },
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en'
  },
  tone: {
    type: String,
    enum: ['formal', 'neutral'],
    default: 'formal'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastError: {
    type: String,
    default: ''
  },
  sentAt: {
    type: Date
  },
  acknowledgedAt: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

assignmentSchema.index({ complaint: 1 });
assignmentSchema.index({ organization: 1 });
assignmentSchema.index({ status: 1, createdAt: -1 });
assignmentSchema.index({ channel: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
