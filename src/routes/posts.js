import { Router } from 'express';
import { Comment, Post } from '../models.js';
import { addNotification, serializeComment, serializePost } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, forbidden, notFound } from '../utils/httpError.js';

export const postsRouter = Router();

postsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const posts = await Post.find().sort({ created_at: -1 }).skip(Number(req.query.skip || 0)).limit(Number(req.query.limit || 50));
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

postsRouter.get(
  '/feed',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = req.query.reels === 'true' ? { video: { $nin: [null, ''] } } : {};
    const posts = await Post.find(query).sort({ created_at: -1 }).skip(Number(req.query.skip || 0)).limit(Number(req.query.limit || 10));
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

postsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { caption = '', image = null, video = null, group_id = null } = req.body;
    if (!caption && !image && !video) throw new HttpError(400, 'caption, image or video is required.');
    const post = await Post.create({ user_id: req.user.id, group_id: group_id ? String(group_id) : null, caption, image, video, likes: [] });
    res.status(201).json(await serializePost(post, req.user.id));
  }),
);

postsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    res.json(await serializePost(post, req.user.id));
  }),
);

postsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    if (post.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) throw forbidden('You cannot delete this post.');
    await Post.deleteOne({ id: post.id });
    await Comment.deleteMany({ post_id: post.id });
    res.json({ status: 'deleted' });
  }),
);

postsRouter.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    if (post.likes.includes(req.user.id)) post.likes = post.likes.filter((id) => id !== req.user.id);
    else {
      post.likes.push(req.user.id);
      await addNotification({ user_id: post.user_id, sender_id: req.user.id, type: 'like', post_id: post.id });
    }
    await post.save();
    res.json({ status: 'ok', likes_count: post.likes.length });
  }),
);

postsRouter.get(
  '/:id/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const comments = await Comment.find({ post_id: req.params.id }).sort({ created_at: 1 });
    res.json(await Promise.all(comments.map((comment) => serializeComment(comment, req.user.id))));
  }),
);

postsRouter.post(
  '/:id/comments/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) throw notFound('Post not found.');
    if (!req.body.content) throw new HttpError(400, 'content is required.');
    const comment = await Comment.create({ user_id: req.user.id, post_id: post.id, content: req.body.content, likes: [] });
    await addNotification({ user_id: post.user_id, sender_id: req.user.id, type: 'comment', post_id: post.id, comment_id: comment.id });
    res.status(201).json(await serializeComment(comment, req.user.id));
  }),
);
