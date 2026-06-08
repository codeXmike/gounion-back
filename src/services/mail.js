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
