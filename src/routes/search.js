import { Router } from 'express';
import { Group, Post, User } from '../models.js';
import { publicUser, serializeGroup, serializePost } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const searchRouter = Router();

const regex = (q) => new RegExp(String(q || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

searchRouter.get(
  '/users',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = regex(req.query.q);
    const users = await User.find({
      id: { $ne: req.user.id },
      $or: [{ username: q }, { email: q }, { 'profile.full_name': q }],
    }).limit(50);
    res.json(await Promise.all(users.map((user) => publicUser(user, req.user.id))));
  }),
);

searchRouter.get(
  '/posts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const posts = await Post.find({ caption: regex(req.query.q) }).sort({ created_at: -1 }).limit(50);
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

searchRouter.get(
  '/groups',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = regex(req.query.q);
    const groups = await Group.find({ $or: [{ name: q }, { description: q }] }).limit(50);
    res.json(await Promise.all(groups.map((group) => serializeGroup(group, req.user.id))));
  }),
);
