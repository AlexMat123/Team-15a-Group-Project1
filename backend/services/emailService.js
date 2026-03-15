const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || undefined,
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendNewUserWelcomeEmail = async ({
  to,
  tempPassword,
  loginUrl,
  role,
  adminEmail,
}) => {
  const subject = 'Your QC account has been created';

  const text = `
You have been added to the QC Checker platform.

Assigned role: ${role}
Login email: ${to}
Temporary password: ${tempPassword}
Login link: ${loginUrl}
Reply to: ${adminEmail}

You will be asked to change your password when you log in for the first time.
  `.trim();

  const html = `
    <p>You have been added to the <strong>QC Checker</strong> platform.</p>
    <p><strong>Assigned role:</strong> ${role}</p>
    <p><strong>Login email:</strong> ${to}</p>
    <p><strong>Temporary password:</strong> ${tempPassword}</p>
    <p><strong>Login link:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
    <p><strong>Reply to:</strong> ${adminEmail}</p>
    <p>You will be asked to change your password when you log in for the first time.</p>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    replyTo: adminEmail,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendNewUserWelcomeEmail,
};
