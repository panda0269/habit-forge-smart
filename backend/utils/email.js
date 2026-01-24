const nodemailer = require('nodemailer');

// Create transporter with SMTP settings
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email not sent - SMTP not configured');
    console.log(`Reset URL would be: ${resetUrl}?token=${resetToken}`);
    return { success: false, message: 'Email not configured' };
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@habitforge.com';
  
  const mailOptions = {
    from: `"HabitForge" <${fromEmail}>`,
    to: email,
    subject: 'Reset Your Password - HabitForge',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #18181b; margin: 0; font-size: 24px;">🎯 HabitForge</h1>
            </div>
            
            <h2 style="color: #18181b; margin-bottom: 20px;">Reset Your Password</h2>
            
            <p style="color: #52525b; margin-bottom: 20px;">
              You requested to reset your password. Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}?token=${resetToken}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #71717a; font-size: 14px; margin-bottom: 10px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #10b981; font-size: 14px; word-break: break-all; margin-bottom: 20px;">
              ${resetUrl}?token=${resetToken}
            </p>
            
            <div style="border-top: 1px solid #e4e4e7; padding-top: 20px; margin-top: 30px;">
              <p style="color: #a1a1aa; font-size: 13px; margin: 0;">
                This link will expire in <strong>1 hour</strong>.
              </p>
              <p style="color: #a1a1aa; font-size: 13px; margin-top: 10px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          </div>
          
          <p style="text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 20px;">
            © ${new Date().getFullYear()} HabitForge. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
      Reset Your Password - HabitForge
      
      You requested to reset your password. Visit the link below to set a new password:
      
      ${resetUrl}?token=${resetToken}
      
      This link will expire in 1 hour.
      
      If you didn't request this, you can safely ignore this email.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail
};
