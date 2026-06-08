import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const { Schema, model, models } = mongoose;
const makeId = () => nanoid(12);

const profileSchema = new Schema(
  {
    id: { type: String, default: makeId },
    user_id: String,
    full_name: String,
    bio: { type: String, default: '' },
    university: { type: String, default: 'University Student' },
    profile_picture: { type: String, default: '' },
    cover_photo: { type: String, default: '' },
    course: { type: String, default: '' },
    hometown: { type: String, default: '' },
  },
  { _id: false },
);

const baseOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
};

const userSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    username: { type: String, unique: true, required: true, trim: true, index: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true, index: true },
    password_hash: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    is_online: { type: Boolean, default: false },
    last_seen: { type: Date, default: null },
    email_verified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    profile: { type: profileSchema, default: () => ({}) },
  },
  baseOptions,
);

const followSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId },
    follower_id: { type: String, required: true, index: true },
    following_id: { type: String, required: true, index: true },
  },
  baseOptions,
);
followSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });

const postSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    user_id: { type: String, required: true, index: true },
    group_id: { type: String, default: null, index: true },
    caption: { type: String, default: '' },
    image: { type: String, default: null },
    video: { type: String, default: null },
    likes: { type: [String], default: [] },
  },
  baseOptions,
);

const commentSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    user_id: { type: String, required: true, index: true },
    post_id: { type: String, required: true, index: true },
    content: { type: String, required: true },
    likes: { type: [String], default: [] },
  },
  baseOptions,
);

const groupSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    cover_image: { type: String, default: null },
    privacy: { type: String, enum: ['public', 'private', 'secret'], default: 'public' },
    creator_id: { type: String, required: true, index: true },
    is_active: { type: Boolean, default: true },
  },
  baseOptions,
);

const groupMemberSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId },
    group_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joined_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
groupMemberSchema.index({ group_id: 1, user_id: 1 }, { unique: true });

const groupRequestSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId },
    group_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  baseOptions,
);

const conversationSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    name: { type: String, default: null },
    participant_ids: { type: [String], default: [], index: true },
  },
  baseOptions,
);

const messageSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    conversation_id: { type: String, required: true, index: true },
    sender_id: { type: String, default: null, index: true },
    content: { type: String, default: '' },
    image_url: { type: String, default: null },
    video_url: { type: String, default: null },
    audio_url: { type: String, default: null },
    sticker_url: { type: String, default: null },
    sticker_id: { type: String, default: null },
    is_read: { type: Boolean, default: false },
  },
  baseOptions,
);

const notificationSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    user_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true, index: true },
    type: { type: String, required: true },
    post_id: { type: String, default: null },
    comment_id: { type: String, default: null },
    group_id: { type: String, default: null },
    message: { type: String, default: null },
    is_read: { type: Boolean, default: false },
  },
  baseOptions,
);

const reportSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    user_id: { type: String, required: true, index: true },
    post_id: { type: String, default: null },
    comment_id: { type: String, default: null },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  },
  baseOptions,
);

const storySchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId, index: true },
    user_id: { type: String, required: true, index: true },
    content: { type: String, default: '' },
    image_url: { type: String, default: null },
    expires_at: { type: Date, required: true },
  },
  baseOptions,
);

const storyViewSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId },
    story_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    viewed_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
storyViewSchema.index({ story_id: 1, user_id: 1 }, { unique: true });

const storyLikeSchema = new Schema(
  {
    id: { type: String, unique: true, default: makeId },
    story_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
  },
  baseOptions,
);
storyLikeSchema.index({ story_id: 1, user_id: 1 }, { unique: true });

const refreshTokenSchema = new Schema(
  {
    token: { type: String, unique: true, required: true },
    user_id: { type: String, required: true, index: true },
  },
  baseOptions,
);

const passwordResetTokenSchema = new Schema(
  {
    token_hash: { type: String, unique: true, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    expires_at: { type: Date, required: true, index: { expires: 0 } },
    used_at: { type: Date, default: null },
  },
  baseOptions,
);

const emailVerificationTokenSchema = new Schema(
  {
    token_hash: { type: String, unique: true, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    expires_at: { type: Date, required: true, index: { expires: 0 } },
    used_at: { type: Date, default: null },
  },
  baseOptions,
);

export const User = models.User || model('User', userSchema);
export const Follow = models.Follow || model('Follow', followSchema);
export const Post = models.Post || model('Post', postSchema);
export const Comment = models.Comment || model('Comment', commentSchema);
export const Group = models.Group || model('Group', groupSchema);
export const GroupMember = models.GroupMember || model('GroupMember', groupMemberSchema);
export const GroupRequest = models.GroupRequest || model('GroupRequest', groupRequestSchema);
export const Conversation = models.Conversation || model('Conversation', conversationSchema);
export const Message = models.Message || model('Message', messageSchema);
export const Notification = models.Notification || model('Notification', notificationSchema);
export const Report = models.Report || model('Report', reportSchema);
export const Story = models.Story || model('Story', storySchema);
export const StoryView = models.StoryView || model('StoryView', storyViewSchema);
export const StoryLike = models.StoryLike || model('StoryLike', storyLikeSchema);
export const RefreshToken = models.RefreshToken || model('RefreshToken', refreshTokenSchema);
export const PasswordResetToken = models.PasswordResetToken || model('PasswordResetToken', passwordResetTokenSchema);
export const EmailVerificationToken = models.EmailVerificationToken || model('EmailVerificationToken', emailVerificationTokenSchema);
