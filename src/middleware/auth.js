import { User } from '../models.js';
import { forbidden, unauthorized } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const requireAuth = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(unauthorized());

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findOne({ id: payload.sub });
    if (!user) return next(unauthorized('User no longer exists.'));
    if (!user.is_active) return next(forbidden('Your account has been suspended.'));
    req.user = user;
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token.'));
  }
};

export const requireAdmin = (req, _res, next) => {
  if (!['admin', 'moderator'].includes(req.user?.role)) return next(forbidden('Admin access required.'));
  return next();
};
