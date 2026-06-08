import dotenv from 'dotenv';

dotenv.config();

const splitOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8001),
  apiBaseUrl: process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 8001}`,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME,
  frontendOrigins: splitOrigins(
    process.env.FRONTEND_ORIGINS ||
      'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,ionic://localhost',
  ),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '30m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'gounion',
  appUrl: (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  mailFrom: process.env.MAIL_FROM || 'GoUnion <no-reply@gounion.app>',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === 'true',
  },
};
