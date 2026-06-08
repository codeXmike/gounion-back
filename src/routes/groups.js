import { Router } from 'express';
import { Group, GroupMember, GroupRequest, Post } from '../models.js';
import { addNotification, publicUser, serializeGroup, serializePost } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, notFound } from '../utils/httpError.js';

export const groupsRouter = Router();

const member = (groupId, userId) => GroupMember.findOne({ group_id: groupId, user_id: userId });
const canManage = async (groupId, user) => ['admin', 'moderator'].includes(user.role) || ['admin', 'moderator'].includes((await member(groupId, user.id))?.role);

groupsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const groups = await Group.find({ is_active: true }).sort({ created_at: -1 });
    res.json(await Promise.all(groups.map((group) => serializeGroup(group, req.user.id))));
  }),
);

groupsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const group = await Group.create({
      name: req.body.name,
      description: req.body.description || '',
      privacy: req.body.privacy || 'public',
      cover_image: req.body.cover_image || null,
      creator_id: req.user.id,
    });
    await GroupMember.create({ group_id: group.id, user_id: req.user.id, role: 'admin' });
    res.status(201).json(await serializeGroup(group, req.user.id));
  }),
);

groupsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw notFound('Group not found.');
    res.json(await serializeGroup(group, req.user.id));
  }),
);

groupsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw notFound('Group not found.');
    if (!(await canManage(group.id, req.user))) throw forbidden('You cannot update this group.');
    group.name = req.body.name ?? group.name;
    group.description = req.body.description ?? group.description;
    group.privacy = req.body.privacy ?? group.privacy;
    group.cover_image = req.query.cover_image || req.body.cover_image || group.cover_image;
    await group.save();
    res.json(await serializeGroup(group, req.user.id));
  }),
);

groupsRouter.post(
  '/:id/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    const group = await Group.findOne({ id: req.params.id });
    if (!group) throw notFound('Group not found.');
    if (await member(group.id, req.user.id)) return res.json({ status: 'joined' });
    if (group.privacy === 'private') {
      const request = await GroupRequest.create({ group_id: group.id, user_id: req.user.id, status: 'pending' });
      await addNotification({ user_id: group.creator_id, sender_id: req.user.id, type: 'group_request', group_id: group.id });
      return res.json({ status: 'requested', request: request.toObject() });
    }
    await GroupMember.create({ group_id: group.id, user_id: req.user.id, role: 'member' });
    return res.json({ status: 'joined' });
  }),
);

groupsRouter.get(
  '/:id/members/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const members = await GroupMember.find({ group_id: req.params.id });
    res.json(await Promise.all(members.map(async (item) => ({ ...item.toObject(), user: await publicUser(item.user_id, req.user.id) }))));
  }),
);

groupsRouter.get(
  '/:id/requests/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await canManage(req.params.id, req.user))) return res.json([]);
    const requests = await GroupRequest.find({ group_id: req.params.id, status: 'pending' });
    res.json(await Promise.all(requests.map(async (item) => ({ ...item.toObject(), user: await publicUser(item.user_id, req.user.id) }))));
  }),
);

groupsRouter.post(
  '/requests/:requestId/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const request = await GroupRequest.findOne({ id: req.params.requestId });
    if (!request) throw notFound('Request not found.');
    if (!(await canManage(request.group_id, req.user))) throw forbidden('You cannot approve this request.');
    request.status = req.query.status || 'accepted';
    await request.save();
    if (request.status === 'accepted') {
      await GroupMember.updateOne({ group_id: request.group_id, user_id: request.user_id }, { $setOnInsert: { group_id: request.group_id, user_id: request.user_id, role: 'member' } }, { upsert: true });
    }
    res.json(request.toObject());
  }),
);

groupsRouter.get(
  '/:id/posts/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const posts = await Post.find({ group_id: req.params.id }).sort({ created_at: -1 });
    res.json(await Promise.all(posts.map((post) => serializePost(post, req.user.id))));
  }),
);

groupsRouter.put(
  '/:groupId/members/:userId/role',
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await member(req.params.groupId, req.params.userId);
    if (!item) throw notFound('Member not found.');
    if (!(await canManage(item.group_id, req.user))) throw forbidden('You cannot update this member.');
    item.role = req.query.role || req.body.role || item.role;
    await item.save();
    res.json(item.toObject());
  }),
);

groupsRouter.delete(
  '/:groupId/members/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!(await canManage(req.params.groupId, req.user))) throw forbidden('You cannot remove members.');
    await GroupMember.deleteOne({ group_id: req.params.groupId, user_id: req.params.userId });
    res.json({ status: 'removed' });
  }),
);
