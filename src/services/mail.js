import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const hasSmtpConfig = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const getTransport = () => {
  if (!hasSmtpConfig()) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
};

export const sendMail = async ({ to, subject, text, html }) => {
  const transport = getTransport();
  if (!transport) {
    if (env.nodeEnv !== 'production') {
      console.log(`[mail:dev] ${subject} -> ${to}\n${text}`);
      return { skipped: true };
    }
    throw new Error('SMTP is not configured.');
  }

  return transport.sendMail({
    from: env.mailFrom,
    to,
    subject,
    text,
    html,
  });
};

export const sendWelcomeEmail = (user, verifyUrl) =>
  sendMail({
    to: user.email,
    subject: 'Confirm your GoUnion email',
    text: `Welcome to GoUnion. Confirm your email here: ${verifyUrl}`,
    html: `<p>Welcome to GoUnion.</p><p><a href="${verifyUrl}">Confirm your email</a></p>`,
  });

export const sendPasswordResetEmail = (user, resetUrl) =>
  sendMail({
    to: user.email,
    subject: 'Reset your GoUnion password',
    text: `Reset your GoUnion password here: ${resetUrl}\nThis link expires in 60 minutes.`,
    html: `<p>Reset your GoUnion password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 60 minutes.</p>`,
  });

export const sendOtpEmail = (user, otp) =>
  sendMail({
    to: user.email,
    subject: 'Your GoUnion verification code',
    text: `Your GoUnion verification code is: ${otp}\nIt expires in 15 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0c;border-radius:16px;color:#fff;">
        <h2 style="margin:0 0 8px;font-size:24px;">Verify your GoUnion account</h2>
        <p style="color:#888;margin:0 0 32px;font-size:14px;">Enter this code in the app to confirm your email address.</p>
        <div style="letter-spacing:12px;font-size:40px;font-weight:900;text-align:center;padding:24px;background:#151518;border-radius:12px;border:1px solid #222;">${otp}</div>
        <p style="color:#555;font-size:12px;margin:24px 0 0;text-align:center;">Expires in 15 minutes &bull; Do not share this code</p>
      </div>`,
  });
