// Simple logger wrapper. Project already uses morgan in index.js, this is a small helper for app logs.
export default {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};
