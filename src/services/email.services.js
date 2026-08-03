
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Ledger System" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const sendRegistrationEmail = async (userEmail, name) => {
const subject = "Welcome to LedgerFlow";

const text = `Hello ${name}, \n\nThank you for registration at LedgerFlow. We are excited to have you on board!\n\n Best regards,\n The LedgerFlow team.`;

const html = `<p>Hello ${name},</p><p>Thank you for registration at LedgerFlow.We are excited to have you on board!</p><p>Best regards,<br> The LedgerFlow team.</p>`;

await sendEmail(userEmail, subject, text, html);
};

const SendTransactionEmail = async (userEmail, name, amount, toAccount) => {
    const subject = "Transaction Successful - LedgerFlow";

    const text = `Hello ${name},

Your transaction has been completed successfully.

Transaction Details:
- Amount: ₹${amount}
- Sent To: ${toAccount}

Thank you for using LedgerFlow.

Best regards,
The LedgerFlow Team`;

    const html = `
        <h2>Transaction Successful</h2>
        <p>Hello <strong>${name}</strong>,</p>

        <p>Your transaction has been completed successfully.</p>

        <h3>Transaction Details</h3>
        <ul>
            <li><strong>Amount:</strong> ₹${amount}</li>
            <li><strong>Sent To:</strong> ${toAccount}</li>
        </ul>

        <p>Thank you for using <strong>LedgerFlow</strong>.</p>

        <p>Best regards,<br>
        <strong>The LedgerFlow Team</strong></p>
    `;

    await sendEmail(userEmail, subject, text, html);
};

module.exports = {
  sendRegistrationEmail,
  SendTransactionEmail
}
