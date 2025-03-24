// src/middlewares/cacheMiddleware.js
// Simple in-memory cache implementation without external dependencies

// Create a simple cache with Map
const cache = new Map();

/**
 * Middleware for caching API responses
 * @param {number} ttl - Time to live in seconds
 */
export const cacheMiddleware = (ttl = 600) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a cache key from the URL
    const cacheKey = `${req.originalUrl}`;
    
    // Check if we have a cached response for this request
    const cachedItem = cache.get(cacheKey);
    
    if (cachedItem && cachedItem.expiry > Date.now()) {
      // Return the cached response
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json(cachedItem.data);
    }

    // Store the original json method
    const originalJson = res.json;
    
    // Override the json method to cache the response before sending
    res.json = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Caching response for: ${cacheKey}`);
        const expiry = Date.now() + (ttl * 1000);
        cache.set(cacheKey, { data: body, expiry });
      }
      
      // Call the original json method
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Function to invalidate cache entries by pattern
 * @param {string} pattern - Pattern to match cache keys
 */
export const invalidateCache = (pattern) => {
  // Convert keys to array so we can iterate while deleting
  const keys = [...cache.keys()];
  
  const matchingKeys = keys.filter(key => 
    key.includes(pattern)
  );
  
  if (matchingKeys.length > 0) {
    console.log(`Invalidating cache keys: ${matchingKeys.join(', ')}`);
    matchingKeys.forEach(key => cache.delete(key));
  }
};

export default { cacheMiddleware, invalidateCache, cache };