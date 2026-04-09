let twilioClient = null;

function hasTwilioConfig() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function getClient() {
  if (!twilioClient) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

async function sendSms({ to, body }) {
  if (!hasTwilioConfig() || !process.env.TWILIO_SMS_FROM) {
    return { skipped: true, reason: 'Twilio SMS not configured' };
  }

  const client = getClient();
  const msg = await client.messages.create({
    from: process.env.TWILIO_SMS_FROM,
    to,
    body
  });

  return { skipped: false, messageId: msg.sid || '' };
}

async function sendWhatsapp({ to, body }) {
  if (!hasTwilioConfig() || !process.env.TWILIO_WHATSAPP_FROM) {
    return { skipped: true, reason: 'Twilio WhatsApp not configured' };
  }

  const client = getClient();
  const msg = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    body
  });

  return { skipped: false, messageId: msg.sid || '' };
}

module.exports = {
  sendSms,
  sendWhatsapp,
  hasTwilioConfig
};
