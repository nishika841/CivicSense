let nodemailer;

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

async function getTransport() {
  if (!nodemailer) {
    nodemailer = require('nodemailer');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendEmail({ to, subject, text }) {
  if (!hasSmtpConfig()) {
    return {
      skipped: true,
      reason: 'SMTP not configured'
    };
  }

  const transport = await getTransport();
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text
  });

  return {
    skipped: false,
    messageId: info.messageId || ''
  };
}

module.exports = {
  sendEmail,
  hasSmtpConfig
};
