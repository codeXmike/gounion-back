import { Router } from 'express';
import { Story, StoryLike, StoryView } from '../models.js';
import { serializeStory } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';

export const storiesRouter = Router();

storiesRouter.get(
  '/feed',
  requireAuth,
  asyncHandler(async (req, res) => {
    const stories = await Story.find({ expires_at: { $gt: new Date() } }).sort({ created_at: -1 }).limit(100);
    res.json(await Promise.all(stories.map((story) => serializeStory(story, req.user.id))));
  }),
);

storiesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const story = await Story.create({
      user_id: req.user.id,
      content: req.body.content || '',
      image_url: req.body.image_url || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    res.status(201).json(await serializeStory(story, req.user.id));
  }),
);

storiesRouter.post(
  '/:id/view',
  requireAuth,
  asyncHandler(async (req, res) => {
    const story = await Story.findOne({ id: req.params.id });
    if (!story) throw notFound('Story not found.');
    await StoryView.updateOne({ story_id: story.id, user_id: req.user.id }, { $setOnInsert: { story_id: story.id, user_id: req.user.id } }, { upsert: true });
    res.json({ status: 'viewed' });
  }),
);

storiesRouter.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    const story = await Story.findOne({ id: req.params.id });
    if (!story) throw notFound('Story not found.');
    const existing = await StoryLike.findOne({ story_id: story.id, user_id: req.user.id });
    if (existing) await StoryLike.deleteOne({ id: existing.id });
    else await StoryLike.create({ story_id: story.id, user_id: req.user.id });
    res.json(await serializeStory(story, req.user.id));
  }),
);
