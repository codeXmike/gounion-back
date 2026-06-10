import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import { Router } from 'express';
import { EmailVerificationToken, OtpToken, PasswordResetToken, RefreshToken, User } from '../models.js';
import { env } from '../config/env.js';
import { publicUser } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, unauthorized } from '../utils/httpError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/mail.js';
import { createOpaqueToken, hashOpaqueToken } from '../services/tokens.js';

const form = multer();
export const authRouter = Router();

// ── helpers ────────────────────────────────────────────────────────────────

const issueTokens = async (user) => {
  const access_token = signAccessToken(user);
  const refresh_token = signRefreshToken(user);
  await RefreshToken.create({ token: refresh_token, user_id: user.id });
  return { access_token, refresh_token, token_type: 'bearer' };
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

/** Creates a fresh OTP, stores it, and emails it to the user. */
const issueOtp = async (user) => {
  await OtpToken.deleteMany({ user_id: user.id, used_at: null });
  const otp = generateOtp();
  await OtpToken.create({
    otp_hash: hashOtp(otp),
    user_id: user.id,
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  });
  await sendOtpEmail(user, otp);
};

// ── routes ─────────────────────────────────────────────────────────────────

authRouter.post(
  '/token',
  form.none(),
  asyncHandler(async (req, res) => {
    const emailOrUsername = String(req.body.username || '').toLowerCase();
    const user = await User.findOne({ $or: [{ email: emailOrUsername }, { username: req.body.username }] });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) throw unauthorized('Incorrect username or password.');
    if (!user.is_active) throw new HttpError(403, 'Your account has been suspended.');
    if (!user.email_verified) throw new HttpError(403, 'Verify your email address.');
    res.json(await issueTokens(user));
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.body.refresh_token;
    const stored = token ? await RefreshToken.findOne({ token }) : null;
    if (!stored) throw unauthorized('Invalid refresh token.');
    const payload = verifyRefreshToken(token);
    const user = await User.findOne({ id: payload.sub });
    if (!user) throw unauthorized('User no longer exists.');
    await RefreshToken.deleteOne({ token });
    res.json(await issueTokens(user));
  }),
);

authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) throw new HttpError(400, 'email is required.');

    const user = await User.findOne({ email });
    if (user) {
      const token = createOpaqueToken();
      await PasswordResetToken.deleteMany({ user_id: user.id, used_at: null });
      await PasswordResetToken.create({
        token_hash: hashOpaqueToken(token),
        user_id: user.id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      });
      await sendPasswordResetEmail(user, `${env.appUrl}/reset-password?token=${token}`);
    }

    res.json({ status: 'ok', message: 'If the email exists, a reset link has been sent.' });
  }),
);

authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const token = String(req.body.token || '');
    const newPassword = String(req.body.new_password || '');
    if (!token) throw new HttpError(400, 'token is required.');
    if (newPassword.length < 8) throw new HttpError(400, 'new_password must be at least 8 characters.');

    const resetToken = await PasswordResetToken.findOne({
      token_hash: hashOpaqueToken(token),
      used_at: null,
      expires_at: { $gt: new Date() },
    });
    if (!resetToken) throw unauthorized('Reset link is invalid or expired.');

    const user = await User.findOne({ id: resetToken.user_id });
    if (!user) throw unauthorized('Reset link is invalid or expired.');

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    resetToken.used_at = new Date();
    await resetToken.save();
    await RefreshToken.deleteMany({ user_id: user.id });

    res.json({ status: 'ok', message: 'Password updated.' });
  }),
);

/**
 * POST /auth/verify-otp
 * Body: { email, otp }
 * Verifies the 6-digit OTP and marks the user's email as confirmed.
 */
authRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    if (!email) throw new HttpError(400, 'email is required.');
    if (!otp) throw new HttpError(400, 'otp is required.');

    const user = await User.findOne({ email });
    if (!user) throw new HttpError(404, 'No account found with that email.');

    if (user.email_verified) {
      return res.json({ status: 'ok', message: 'Email already verified.' });
    }

    const otpRecord = await OtpToken.findOne({
      otp_hash: hashOtp(otp),
      user_id: user.id,
      used_at: null,
      expires_at: { $gt: new Date() },
    });
    if (!otpRecord) throw new HttpError(400, 'Invalid or expired code. Please try again.');

    user.email_verified = true;
    await user.save();
    otpRecord.used_at = new Date();
    await otpRecord.save();

    res.json({ status: 'ok', message: 'Email verified.' });
  }),
);

/**
 * POST /auth/resend-otp
 * Body: { email }
 * Sends a fresh OTP to the given (unverified) email address.
 */
authRouter.post(
  '/resend-otp',
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) throw new HttpError(400, 'email is required.');

    const user = await User.findOne({ email });
    // Respond the same way whether the user exists or not (no enumeration)
    if (user && !user.email_verified) {
      await issueOtp(user);
    }

    res.json({ status: 'ok', message: 'If the email is pending verification, a new code has been sent.' });
  }),
);

// Keep the old confirm-email route for backwards-compatibility with any
// magic-link emails that were sent before this migration.
authRouter.post(
  '/confirm-email',
  asyncHandler(async (req, res) => {
    const token = String(req.body.token || req.query.token || '');
    if (!token) throw new HttpError(400, 'token is required.');
    const emailToken = await EmailVerificationToken.findOne({
      token_hash: hashOpaqueToken(token),
      used_at: null,
      expires_at: { $gt: new Date() },
    });
    if (!emailToken) throw unauthorized('Confirmation link is invalid or expired.');
    const user = await User.findOne({ id: emailToken.user_id });
    if (!user) throw unauthorized('Confirmation link is invalid or expired.');
    user.email_verified = true;
    await user.save();
    emailToken.used_at = new Date();
    await emailToken.save();
    res.json({ status: 'ok', message: 'Email confirmed.' });
  }),
);

authRouter.get(
  '/session',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await publicUser(req.user, req.user.id));
  }),
);
