import { Router } from 'express';
import { Conversation, Message } from '../models.js';
import { addNotification, serializeConversation, serializeMessage } from '../store.js';
import { getIo } from '../socket.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, notFound } from '../utils/httpError.js';

export const conversationsRouter = Router();

const hasParticipant = (conversation, userId) => conversation?.participant_ids.includes(userId);

conversationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({ participant_ids: req.user.id }).sort({ updated_at: -1 });
    const serialized = await Promise.all(conversations.map(serializeConversation));
    serialized.sort((a, b) => new Date((b.messages.at(-1) || b).created_at) - new Date((a.messages.at(-1) || a).created_at));
    res.json(serialized);
  }),
);

conversationsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const participantIds = Array.from(new Set([req.user.id, ...(req.body.participant_ids || []).map(String)]));
    const existing = await Conversation.findOne({ participant_ids: { $all: participantIds, $size: participantIds.length } });
    if (existing) return res.json(await serializeConversation(existing));
    const conversation = await Conversation.create({ name: req.body.name || null, participant_ids: participantIds });
    
    res.status(201).json(await serializeConversation(conversation));
  }),
);

conversationsRouter.get(
  '/:id/messages/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) throw notFound('Conversation not found.');
    if (!hasParticipant(conversation, req.user.id)) throw forbidden('You cannot view this conversation.');
    const messages = await Message.find({ conversation_id: conversation.id }).sort({ created_at: 1 });
    res.json(await Promise.all(messages.map(serializeMessage)));
  }),
);

conversationsRouter.post(
  '/:id/messages/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({ id: req.params.id });
    if (!conversation) throw notFound('Conversation not found.');
    if (!hasParticipant(conversation, req.user.id)) throw forbidden('You cannot message this conversation.');
    const message = await Message.create({
      conversation_id: conversation.id,
      sender_id: req.user.id,
      content: req.body.content || '',
      image_url: req.body.image_url || null,
      video_url: req.body.video_url || null,
      audio_url: req.body.audio_url || null,
      sticker_url: req.body.sticker_url || null,
      sticker_id: req.body.sticker_id || null,
      is_read: false,
    });
    conversation.updated_at = new Date();
    await conversation.save();
    await Promise.all(conversation.participant_ids.filter((id) => id !== req.user.id).map((id) => addNotification({ user_id: id, sender_id: req.user.id, type: 'new_message' })));
      // Emit socket event to participants
      try {
        const io = getIo();
        if (io) {
          const serialized = await serializeMessage(message);
          (conversation.participant_ids || []).forEach((pid) => {
            if (String(pid) !== String(req.user.id)) {
              io.to(`user:${pid}`).emit('new_message', { type: 'new_message', message: serialized });
            }
          });
        }
      } catch (e) {
        // ignore
      }

      res.status(201).json(await serializeMessage(message));
  }),
);
