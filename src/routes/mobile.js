import { Router } from 'express';

export const mobileRouter = Router();

const parseVersion = (version = '') =>
  version
    .replace(/[-_]/g, '.')
    .split('.')
    .map((part) => Number(String(part).replace(/\D/g, '') || 0));

const isLess = (left, right) => {
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const a = left[i] || 0;
    const b = right[i] || 0;
    if (a !== b) return a < b;
  }
  return false;
};

mobileRouter.get('/version', (req, res) => {
  const latest = process.env.MOBILE_LATEST_VERSION || '2026.04.14.1';
  const minimum = process.env.MOBILE_MIN_SUPPORTED_VERSION || latest;
  const current = req.query.current_version || null;
  res.json({
    latest_version: latest,
    min_supported_version: minimum,
    apk_url: process.env.MOBILE_APK_URL || '',
    force_update: current ? isLess(parseVersion(current), parseVersion(minimum)) : false,
    has_update: current ? isLess(parseVersion(current), parseVersion(latest)) : false,
    current_version: current,
    release_notes: process.env.MOBILE_RELEASE_NOTES || null,
  });
});
