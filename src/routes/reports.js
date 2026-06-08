import { Router } from 'express';
import { Report } from '../models.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

export const reportsRouter = Router();

reportsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const postId = req.body.postId ?? req.body.post_id;
    const commentId = req.body.commentId ?? req.body.comment_id;
    if (!req.body.reason) throw new HttpError(400, 'reason is required.');
    const report = await Report.create({
      reason: req.body.reason,
      user_id: req.user.id,
      post_id: postId ? String(postId) : null,
      comment_id: commentId ? String(commentId) : null,
      status: 'pending',
    });
    res.status(201).json(report.toObject());
  }),
);
