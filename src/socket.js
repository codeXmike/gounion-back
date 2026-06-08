import { Server } from 'socket.io';
import { env } from './config/env.js';
import { User } from './models.js';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.frontendOrigins || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    let authedUserId = null;

    const markOnline = async (userId) => {
      if (!userId) return;
      authedUserId = String(userId);
      socket.join(`user:${authedUserId}`);
      await User.updateOne({ id: authedUserId }, { is_online: true, last_seen: null });
      socket.broadcast.emit('user_online', { userId: authedUserId, user_id: authedUserId });
    };

    const markOffline = async (userId) => {
      if (!userId) return;
      const lastSeen = new Date();
      await User.updateOne({ id: String(userId) }, { is_online: false, last_seen: lastSeen });
      socket.broadcast.emit('user_offline', {
        userId: String(userId),
        user_id: String(userId),
        lastSeen: lastSeen.toISOString(),
        last_seen: lastSeen.toISOString(),
      });
    };

    socket.on('authenticate', (data) => {
      try {
        const userId = data && data.userId;
        void markOnline(userId);
      } catch (e) {
        // ignore
      }
    });

    socket.on('user_online', (data) => {
      try {
        void markOnline(data && (data.userId || data.user_id));
      } catch (e) {
        // ignore
      }
    });

    socket.on('user_offline', (data) => {
      try {
        void markOffline((data && (data.userId || data.user_id)) || authedUserId);
      } catch (e) {
        // ignore
      }
    });

    socket.on('joinConversation', (convId) => {
      if (convId) socket.join(`conversation:${convId}`);
    });

    socket.on('disconnect', () => {
      void markOffline(authedUserId);
    });
  });

  return io;
};

export const getIo = () => io;
