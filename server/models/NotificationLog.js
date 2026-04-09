const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'whatsapp'],
    default: 'email'
  },
  provider: {
    type: String,
    enum: ['smtp', 'twilio', 'none'],
    default: 'none'
  },
  to: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: ''
  },
  body: {
    type: String,
    default: ''
  },
  template: {
    id: {
      type: String,
      default: ''
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
    }
  },
  success: {
    type: Boolean,
    default: false
  },
  providerMessageId: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationLogSchema.index({ assignment: 1, createdAt: -1 });
notificationLogSchema.index({ success: 1, createdAt: -1 });
notificationLogSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
