import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Router } from 'express';
import { EmailVerificationToken, PasswordResetToken, RefreshToken, User } from '../models.js';
import { env } from '../config/env.js';
import { publicUser } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, unauthorized } from '../utils/httpError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { sendPasswordResetEmail } from '../services/mail.js';
import { createOpaqueToken, hashOpaqueToken } from '../services/tokens.js';

const form = multer();
export const authRouter = Router();

const issueTokens = async (user) => {
  const access_token = signAccessToken(user);
  const refresh_token = signRefreshToken(user);
  await RefreshToken.create({ token: refresh_token, user_id: user.id });
  return { access_token, refresh_token, token_type: 'bearer' };
};

authRouter.post(
  '/token',
  form.none(),
  asyncHandler(async (req, res) => {
    const emailOrUsername = String(req.body.username || '').toLowerCase();
    const user = await User.findOne({ $or: [{ email: emailOrUsername }, { username: req.body.username }] });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) throw unauthorized('Incorrect username or password.');
    if (!user.is_active) throw new HttpError(403, 'Your account has been suspended.');
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
