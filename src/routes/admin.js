import { Router } from 'express';
import { Comment, Group, Post, Report, User } from '../models.js';
import { publicUser, serializeComment, serializePost } from '../store.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [total_users, total_posts, total_groups, pending_reports] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Group.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);
    res.json({ total_users, total_posts, total_groups, pending_reports });
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ created_at: -1 }).skip(Number(req.query.skip || 0)).limit(Number(req.query.limit || 100));
    res.json(await Promise.all(users.map((user) => publicUser(user, req.user.id))));
  }),
);

adminRouter.put(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ id: req.params.id });
    if (!user) throw notFound('User not found.');
    user.role = req.query.role || req.body.role || user.role;
    await user.save();
    res.json(await publicUser(user, req.user.id));
  }),
);

adminRouter.post(
  '/users/:id/toggle-active',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ id: req.params.id });
    if (!user) throw notFound('User not found.');
    user.is_active = !user.is_active;
    await user.save();
    res.json(await publicUser(user, req.user.id));
  }),
);

adminRouter.get(
  '/reports/',
  asyncHandler(async (req, res) => {
    const reports = await Report.find().sort({ created_at: -1 });
    res.json(
      await Promise.all(
        reports.map(async (reportDoc) => {
          const report = reportDoc.toObject();
          delete report._id;
          const [post, comment] = await Promise.all([
            report.post_id ? Post.findOne({ id: report.post_id }) : null,
            report.comment_id ? Comment.findOne({ id: report.comment_id }) : null,
          ]);
          return {
            ...report,
            user: await publicUser(report.user_id, req.user.id),
            post: post ? await serializePost(post, req.user.id) : null,
            comment: comment ? await serializeComment(comment, req.user.id) : null,
          };
        }),
      ),
    );
  }),
);

adminRouter.post(
  '/reports/:id/resolve',
  asyncHandler(async (req, res) => {
    const report = await Report.findOne({ id: req.params.id });
    if (!report) throw notFound('Report not found.');
    report.status = req.query.status || req.body.status || 'resolved';
    await report.save();
    res.json(report.toObject());
  }),
);
