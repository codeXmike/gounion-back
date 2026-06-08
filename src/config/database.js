import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is required. Add it to new-backend/.env.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName || undefined,
  });
};
