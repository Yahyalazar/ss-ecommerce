import nodemailer from "nodemailer";
import AppError from "@/shared/errors/AppError";

// Define the type for email options
interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Define the type for mail options
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

const resolveTransportConfig = () => {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPortValue = process.env.SMTP_PORT?.trim();
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const emailService = process.env.EMAIL_SERVICE?.trim() || "gmail";

  if (smtpHost) {
    const smtpPort = Number(smtpPortValue || (smtpSecure ? 465 : 587));

    if (!emailUser || !emailPass) {
      throw new AppError(
        500,
        "Email service is not configured. Set SMTP_HOST, EMAIL_USER, and EMAIL_PASS in the server environment."
      );
    }

    return {
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
    };
  }

  if (!emailUser || !emailPass) {
    throw new AppError(
      500,
      "Email service is not configured. Set EMAIL_USER and EMAIL_PASS in src/server/.env."
    );
  }

  return {
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    service: emailService,
  };
};

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: EmailOptions): Promise<void> => {
  const fromAddress =
    process.env.EMAIL_FROM?.trim() ||
    process.env.EMAIL_USER?.trim() ||
    "no-reply@talashop.local";

  try {
    const transporter = nodemailer.createTransport(resolveTransportConfig());

    const mailOptions: MailOptions = {
      from: fromAddress,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      500,
      "Email delivery failed. Check your SMTP or Gmail credentials and try again."
    );
  }
};

export default sendEmail;
