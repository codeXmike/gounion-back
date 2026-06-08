import { Router } from 'express';
import { User } from '../models.js';
import { publicUser } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';

export const profilesRouter = Router();

profilesRouter.get(
  '/:username',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ username: new RegExp(`^${req.params.username}$`, 'i') });
    if (!user) throw notFound('Profile not found.');
    res.json(await publicUser(user, req.user.id));
  }),
);
