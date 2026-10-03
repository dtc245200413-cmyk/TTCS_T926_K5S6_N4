const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  let transporter;

  // Use real SMTP if configured, otherwise use Ethereal (fake test email)
  if (process.env.EMAIL_USERNAME && process.env.EMAIL_USERNAME !== 'your_email@gmail.com') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    // Generate a test account on the fly for development
    console.log("Creating Ethereal test email account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const mailOptions = {
    from: `Hệ Thống Tuyển Dụng Nội Bộ <no-reply@company.com>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  
  if (!process.env.EMAIL_USERNAME || process.env.EMAIL_USERNAME === 'your_email@gmail.com') {
    console.log("==================================================");
    console.log("Email test đã được gửi!");
    console.log("Hãy click vào link này để xem nội dung email:");
    console.log(nodemailer.getTestMessageUrl(info));
    console.log("==================================================");
  }
};

module.exports = sendEmail;
