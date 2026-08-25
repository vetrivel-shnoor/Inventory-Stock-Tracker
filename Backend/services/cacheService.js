const { connection: redis } = require('../config/redis');
const Product = require('../models/Product');

const CATEGORIES_CACHE_KEY = 'categories_cache';
const CATEGORIES_TTL = 3600; // 1 hour

class CacheService {
  /**
   * Fetch distinct categories from the database and cache them in Redis.
   * This can be used on startup and on demand.
   */
  async loadCategoriesCache() {
    try {
      const categories = await Product.distinct('category', { isArchived: false });
      await redis.setex(CATEGORIES_CACHE_KEY, CATEGORIES_TTL, JSON.stringify(categories));
      console.log(`[Cache] Successfully pre-loaded ${categories.length} categories to Redis.`);
      return categories;
    } catch (error) {
      console.error('[Cache Error] Failed to load categories cache:', error.message);
      return [];
    }
  }

  async getCategories() {
    try {
      const cachedCategories = await redis.get(CATEGORIES_CACHE_KEY);
      if (cachedCategories) {
        return JSON.parse(cachedCategories);
      }
      return await this.loadCategoriesCache();
    } catch (error) {
      console.error('[Cache Error] Failed to get categories from cache:', error.message);
      return [];
    }
  }

  async invalidateCategories() {
    try {
      await redis.del(CATEGORIES_CACHE_KEY);
      console.log(`[Cache] Invalidated categories cache.`);
    } catch (error) {
      console.error('[Cache Error] Failed to invalidate categories cache:', error.message);
    }
  }
}

module.exports = new CacheService();
