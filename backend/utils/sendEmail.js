const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("Email credentials are missing. Skipping email send.");
      return {
        success: false,
        message: "Email credentials not configured",
      };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"CareConnect" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    return {
      success: true,
      info,
    };
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    return {
      success: false,
      message: error.message || "Failed to send email",
    };
  }
};

module.exports = sendEmail;