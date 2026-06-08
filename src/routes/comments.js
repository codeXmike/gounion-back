import { Router } from 'express';
import { Comment } from '../models.js';
import { addNotification } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';

export const commentsRouter = Router();

commentsRouter.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = await Comment.findOne({ id: req.params.id });
    if (!comment) throw notFound('Comment not found.');
    if (comment.likes.includes(req.user.id)) comment.likes = comment.likes.filter((id) => id !== req.user.id);
    else {
      comment.likes.push(req.user.id);
      await addNotification({ user_id: comment.user_id, sender_id: req.user.id, type: 'like_comment', comment_id: comment.id, post_id: comment.post_id });
    }
    await comment.save();
    res.json({ status: 'ok', likes_count: comment.likes.length });
  }),
);
