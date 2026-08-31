const nodemailer = require("nodemailer");

// Validate environment variables
if (!process.env.MAIL_HOST || !process.env.MAIL_PORT || !process.env.EMAIL || !process.env.APP_PASSWORD) {
  console.error("Missing email configuration in environment variables");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
  connectionTimeout: 5000,
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection error : ", error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

const sendMAIL = async ({ to, otp}) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: to,
      subject: 'Verify You Account With - OTP',
      html: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">Verify Your Account</h2>
          <p style="color: #555;">Thank you for using our service! Please use the following OTP to verify your email address:</p>
          <div style="background: #f5f5f5; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;">
            <h1 style="color: #4CAF50; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #777; font-size: 14px;">This OTP is valid for <strong>5 minutes</strong>.</p>
          <p style="color: #777; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Contest Platform. All rights reserved.</p>
        </div>`
    });
    console.log("OTP email sent successfully to:", to);
    
    return info
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
};

module.exports = sendMAIL;
