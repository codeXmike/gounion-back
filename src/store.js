import bcrypt from 'bcryptjs';
import { getIo } from './socket.js';
import {
  Comment,
  Conversation,
  Follow,
  GroupMember,
  Message,
  Notification,
  Post,
  StoryLike,
  StoryView,
  User,
} from './models.js';

export const toPlain = (doc) => {
  if (!doc) return null;
  const value = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  delete value._id;
  return value;
};

export const makeTimestamp = () => new Date().toISOString();

export const ensureSeedAdmin = async () => {
  const seedAdminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@gounion.test';
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'password123';
  const existing = await User.findOne({ email: seedAdminEmail });
  if (existing) return existing;

  const user = await User.create({
    username: seedAdminUsername,
    email: seedAdminEmail,
    password_hash: await bcrypt.hash(seedAdminPassword, 10),
    is_active: true,
    role: 'admin',
    profile: {
      full_name: 'GoUnion Admin',
      bio: 'Campus community admin',
      university: 'GoUnion University',
    },
  });
  user.profile.user_id = user.id;
  await user.save();
  return user;
};

export const publicUser = async (userOrId, viewerId = null) => {
  const user = typeof userOrId === 'string' ? await User.findOne({ id: userOrId }) : userOrId;
  if (!user) return null;
  const plain = toPlain(user);
  const [followers, following, posts, isFollowing] = await Promise.all([
    Follow.countDocuments({ following_id: plain.id }),
    Follow.countDocuments({ follower_id: plain.id }),
    Post.find({ user_id: plain.id }).select('likes').lean(),
    viewerId ? Follow.exists({ follower_id: viewerId, following_id: plain.id }) : null,
  ]);

  return {
    id: plain.id,
    username: plain.username,
    email: plain.email,
    is_active: plain.is_active,
    is_online: plain.is_online,
    last_seen: plain.last_seen,
    email_verified: plain.email_verified,
    role: plain.role,
    profile: plain.profile,
    followers_count: followers,
    following_count: following,
    total_likes: posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
    is_following: Boolean(isFollowing),
  };
};

export const serializeComment = async (commentOrDoc, viewerId = null) => {
  const comment = toPlain(commentOrDoc);
  if (!comment) return null;
  return {
    ...comment,
    user: await publicUser(comment.user_id, viewerId),
    likes_count: comment.likes?.length || 0,
    is_liked: viewerId ? (comment.likes || []).includes(viewerId) : false,
  };
};

export const serializePost = async (postOrDoc, viewerId = null) => {
  const post = toPlain(postOrDoc);
  if (!post) return null;
  const comments = await Comment.find({ post_id: post.id }).sort({ created_at: 1 });
  return {
    ...post,
    user: await publicUser(post.user_id, viewerId),
    comments: await Promise.all(comments.map((comment) => serializeComment(comment, viewerId))),
    likes: await Promise.all((post.likes || []).map((userId) => publicUser(userId, viewerId))),
    likes_count: post.likes?.length || 0,
    comments_count: comments.length,
  };
};

export const addNotification = async ({ user_id, sender_id, type, post_id = null, comment_id = null, group_id = null, message = null }) => {
  if (!user_id || !sender_id || user_id === sender_id) return null;
  const doc = await Notification.create({ user_id, sender_id, type, post_id, comment_id, group_id, message });

  try {
    const io = getIo();
    if (io) {
      const payload = {
        id: doc.id,
        user_id: doc.user_id,
        sender_id: doc.sender_id,
        type: doc.type,
        post_id: doc.post_id,
        comment_id: doc.comment_id,
        group_id: doc.group_id,
        message: doc.message,
        created_at: doc.created_at,
      };
      io.to(`user:${user_id}`).emit('notification', { type: 'new_notification', notification: payload });
    }
  } catch (e) {
    // ignore socket failures
  }

  return doc;
};

export const serializeNotification = async (notificationOrDoc, viewerId = null) => {
  const notification = toPlain(notificationOrDoc);
  return {
    ...notification,
    actor: await publicUser(notification.sender_id, viewerId),
    sender: await publicUser(notification.sender_id, viewerId),
  };
};

export const serializeGroup = async (groupOrDoc, viewerId = null) => {
  const group = toPlain(groupOrDoc);
  return {
    ...group,
    member_count: await GroupMember.countDocuments({ group_id: group.id }),
    is_joined: viewerId ? Boolean(await GroupMember.exists({ group_id: group.id, user_id: viewerId })) : false,
  };
};

export const serializeMessage = async (messageOrDoc) => {
  const message = toPlain(messageOrDoc);
  return {
    ...message,
    sender: message.sender_id ? await publicUser(message.sender_id) : null,
  };
};

export const serializeConversation = async (conversationOrDoc) => {
  const conversation = toPlain(conversationOrDoc);
  const messages = await Message.find({ conversation_id: conversation.id }).sort({ created_at: 1 });
  return {
    ...conversation,
    participants: await Promise.all((conversation.participant_ids || []).map((id) => publicUser(id))),
    messages: await Promise.all(messages.map(serializeMessage)),
  };
};

export const serializeStory = async (storyOrDoc, viewerId = null) => {
  const story = toPlain(storyOrDoc);
  const [views, likes] = await Promise.all([
    StoryView.find({ story_id: story.id }).lean(),
    StoryLike.find({ story_id: story.id }).lean(),
  ]);
  return {
    ...story,
    user: await publicUser(story.user_id, viewerId),
    views: views.map(toPlain),
    likes: likes.map(toPlain),
  };
};
