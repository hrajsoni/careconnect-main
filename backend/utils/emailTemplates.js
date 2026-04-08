const signupWelcomeTemplate = ({ name, role, needsApproval }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px 0; color: #333; }
        .content p { line-height: 1.6; margin: 10px 0; }
        .highlight { color: #0f766e; font-weight: bold; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to CareConnect!</h1>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${name}</span>,</p>
          <p>Thank you for signing up with CareConnect as a <span class="highlight">${role.replace('_', ' ')}</span>!</p>
          ${needsApproval ? `<p>Your account has been created successfully. Our team will review your details and notify you once your account is approved. This typically takes 24-48 hours.</p>` : `<p>Your account is now active and ready to use. You can start exploring CareConnect right away!</p>`}
          <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          <p>Best regards,<br><span class="highlight">The CareConnect Team</span></p>
        </div>
        <div class="footer">
          <p>CareConnect - Healthcare at Your Doorstep</p>
          <p>© 2025 CareConnect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const approvalTemplate = ({ name, role }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px 0; color: #333; }
        .content p { line-height: 1.6; margin: 10px 0; }
        .highlight { color: #0f766e; font-weight: bold; }
        .success-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 8px 12px; border-radius: 4px; font-weight: bold; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Approved! 🎉</h1>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${name}</span>,</p>
          <p>Great news! Your CareConnect account as a <span class="highlight">${role.replace('_', ' ')}</span> has been <span class="success-badge">APPROVED</span>.</p>
          <p>Your profile is now active and visible to patients. You can start accepting bookings and providing care services through CareConnect.</p>
          <p>Log in to your account to complete your profile, set your availability, and configure your service offerings.</p>
          <p>Thank you for joining our healthcare community!</p>
          <p>Best regards,<br><span class="highlight">The CareConnect Team</span></p>
        </div>
        <div class="footer">
          <p>CareConnect - Healthcare at Your Doorstep</p>
          <p>© 2025 CareConnect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const rejectionTemplate = ({ name, role, reason }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #7c2d12 0%, #b45309 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px 0; color: #333; }
        .content p { line-height: 1.6; margin: 10px 0; }
        .highlight { color: #0f766e; font-weight: bold; }
        .reason-box { background: #fef3c7; border-left: 4px solid #b45309; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Status Update</h1>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${name}</span>,</p>
          <p>Thank you for your interest in joining CareConnect as a <span class="highlight">${role.replace('_', ' ')}</span>.</p>
          <p>After careful review of your application, we regret to inform you that your account has not been approved at this time.</p>
          <div class="reason-box">
            <strong>Reason:</strong><br>
            ${reason || 'Your application does not meet our current requirements. Please review the feedback and feel free to reapply.'}
          </div>
          <p>If you believe this is in error or have questions about the decision, please contact our support team. We encourage you to address the concerns raised and reapply in the future.</p>
          <p>Thank you for understanding.<br><span class="highlight">The CareConnect Team</span></p>
        </div>
        <div class="footer">
          <p>CareConnect - Healthcare at Your Doorstep</p>
          <p>© 2025 CareConnect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const paymentTemplate = ({ name, amount, service, status }) => {
  const statusColor = status === 'paid' ? '#065f46' : '#b45309';
  const statusBg = status === 'paid' ? '#d1fae5' : '#fef3c7';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px 0; color: #333; }
        .content p { line-height: 1.6; margin: 10px 0; }
        .highlight { color: #0f766e; font-weight: bold; }
        .payment-details { background: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .detail-label { font-weight: bold; }
        .status-badge { display: inline-block; background: ${statusBg}; color: ${statusColor}; padding: 8px 12px; border-radius: 4px; font-weight: bold; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment ${status === 'paid' ? 'Confirmed' : 'Pending'}</h1>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${name}</span>,</p>
          <p>${status === 'paid' ? 'Thank you! Your payment has been successfully processed.' : 'This is a reminder about your pending payment with CareConnect.'}</p>
          <div class="payment-details">
            <div class="detail-row">
              <span class="detail-label">Service:</span>
              <span>${service}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span>₹${amount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="status-badge">${status.toUpperCase()}</span>
            </div>
          </div>
          ${status === 'paid' ? `<p>Your payment receipt is attached. You can also access it anytime from your CareConnect dashboard.</p>` : `<p>Please complete your payment to confirm your booking. You can make the payment through your CareConnect dashboard.</p>`}
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br><span class="highlight">The CareConnect Team</span></p>
        </div>
        <div class="footer">
          <p>CareConnect - Healthcare at Your Doorstep</p>
          <p>© 2025 CareConnect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  signupWelcomeTemplate,
  approvalTemplate,
  rejectionTemplate,
  paymentTemplate,
};
