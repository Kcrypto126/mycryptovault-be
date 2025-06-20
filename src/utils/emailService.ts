import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    secure: false,
  });

  const message = {
    from: process.env.EMAIL_FROM || 'kaori@cryptowallet.com',
    to: options.to,
    subject: options.subject,
    // text: options.text,
    html: options.html,
  };
  await transporter.verify();
  await transporter.sendMail(message);
};