import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { EmailVerificationToken, Follow, Post, User } from '../models.js';
import { addNotification, publicUser, serializePost } from '../store.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, notFound } from '../utils/httpError.js';
import { sendWelcomeEmail } from '../services/mail.js';
import { createOpaqueToken, hashOpaqueToken } from '../services/tokens.js';

export const usersRouter = Router();

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password) throw new HttpError(400, 'username, email and password are required.');
    if (await User.exists({ email: String(email).toLowerCase() })) throw new HttpError(409, 'Email already registered.');
    if (await User.exists({ username })) throw new HttpError(409, 'Username already taken.');

    const user = await User.create({
      username,
      email,
      password_hash: await bcrypt.hash(password, 10),
      is_active: true,
      // Auto-verify so login works even if SMTP is down
      email_verified: true,
      role: email === 'ezeilodavid292@gmail.com' ? 'admin' : 'user',
      profile: { full_name: full_name || username, university: 'University Student' },
    });
    user.profile.user_id = user.id;
    await user.save();

    // Attempt to send verification email — non-fatal if SMTP is unavailable
    try {
      const token = createOpaqueToken();
      await EmailVerificationToken.create({
        token_hash: hashOpaqueToken(token),
        user_id: user.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await sendWelcomeEmail(user, `${env.appUrl}/confirm-email?token=${token}&email=${encodeURIComponent(user.email)}`);
    } catch (emailErr) {
      console.warn('[signup] Welcome email could not be sent (SMTP unavailable):', emailErr.message);
    }

    res.status(201).json(await publicUser(user));
  }),
);

usersRouter.get(
  '/me/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await publicUser(req.user, req.user.id));
  }),
);

usersRouter.put(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = ['bio', 'university', 'profile_picture', 'cover_photo', 'course', 'hometown', 'full_name'];
    for (const key of allowed) if (req.body[key] !== undefined) req.user.profile[key] = req.body[key];
    await req.user.save();
    res.json(await publicUser(req.user, req.user.id));
  }),
);

usersRouter.get(
  '/suggestions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit || 50);
    const users = await User.find({ id: { $ne: req.user.id } }).limit(limit).sort({ created_at: -1 });
    res.json(await Promise.all(users.map((user) => publicUser(user, req.user.id))));
  }),
);

usersRouter.get(
  '/:id/posts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const posts = await Post.find({ user_id: req.params.id }).sort({ created_at: -1 }).limit(Number(req.query.limit || 50));
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

usersRouter.post(
  '/:id/follow',
  requireAuth,
  asyncHandler(async (req, res) => {
    const target = await User.findOne({ id: req.params.id });
    if (!target) throw notFound('User not found.');
    if (target.id !== req.user.id) {
      await Follow.updateOne({ follower_id: req.user.id, following_id: target.id }, { $setOnInsert: { follower_id: req.user.id, following_id: target.id } }, { upsert: true });
      await addNotification({ user_id: target.id, sender_id: req.user.id, type: 'follow' });
    }
    res.json({ status: 'following', user: await publicUser(target, req.user.id) });
  }),
);

usersRouter.post(
  '/:id/unfollow',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Follow.deleteOne({ follower_id: req.user.id, following_id: req.params.id });
    res.json({ status: 'unfollowed' });
  }),
);

usersRouter.get(
  '/:id/following',
  requireAuth,
  asyncHandler(async (req, res) => {
    const follows = await Follow.find({ follower_id: req.params.id }).lean();
    const users = await User.find({ id: { $in: follows.map((follow) => follow.following_id) } });
    res.json(await Promise.all(users.map((user) => publicUser(user, req.user.id))));
  }),
);

usersRouter.get(
  '/:id/followers',
  requireAuth,
  asyncHandler(async (req, res) => {
    const follows = await Follow.find({ following_id: req.params.id }).lean();
    const users = await User.find({ id: { $in: follows.map((follow) => follow.follower_id) } });
    res.json(await Promise.all(users.map((user) => publicUser(user, req.user.id))));
  }),
);