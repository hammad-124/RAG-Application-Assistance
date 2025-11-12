// utils/cache.js
class SimpleCache {
  constructor(ttlMs = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create a cache instance for RAG responses
export const ragCache = new SimpleCache(3 * 60 * 1000); // 3 minutes TTL

// Auto cleanup every 5 minutes
setInterval(() => {
  ragCache.cleanup();
}, 5 * 60 * 1000);

export default SimpleCache;