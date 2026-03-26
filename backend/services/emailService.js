const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify()
  .then(() => console.log('Email service ready'))
  .catch((err) => console.error('Email service error:', err.message));

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

const sendPasswordResetEmail = async ({
  to,
  tempPassword,
  loginUrl,
  adminEmail,
}) => {
  const subject = 'Your QC Checker password has been reset';

  const text = `
Your QC Checker password has been reset.

Login email: ${to}
Temporary password: ${tempPassword}
Login link: ${loginUrl}
Reply to: ${adminEmail}

You will be asked to change your password when you log in.
  `.trim();

  const html = `
    <p>Your <strong>QC Checker</strong> password has been reset.</p>
    <p><strong>Login email:</strong> ${to}</p>
    <p><strong>Temporary password:</strong> ${tempPassword}</p>
    <p><strong>Login link:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
    <p><strong>Reply to:</strong> ${adminEmail}</p>
    <p>You will be asked to change your password when you log in.</p>
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
  sendPasswordResetEmail,
};
