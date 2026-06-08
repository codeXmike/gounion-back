import { Router } from 'express';
import { Follow, User } from '../models.js';
import { addNotification, publicUser } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';

export const friendsRouter = Router();

friendsRouter.get(
  '/friends/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [following, followers] = await Promise.all([
      Follow.find({ follower_id: req.user.id }).lean(),
      Follow.find({ following_id: req.user.id }).lean(),
    ]);
    const followerSet = new Set(followers.map((follow) => follow.follower_id));
    const mutualIds = following.map((follow) => follow.following_id).filter((id) => followerSet.has(id));
    const users = await User.find({ id: { $in: mutualIds } });
    res.json(await Promise.all(users.map((user) => publicUser(user, req.user.id))));
  }),
);

friendsRouter.post(
  '/friend-request/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const target = await User.findOne({ id: req.params.userId });
    if (!target) throw notFound('User not found.');
    await Follow.updateOne({ follower_id: req.user.id, following_id: target.id }, { $setOnInsert: { follower_id: req.user.id, following_id: target.id } }, { upsert: true });
    await addNotification({ user_id: target.id, sender_id: req.user.id, type: 'follow' });
    res.json({ status: 'sent' });
  }),
);
