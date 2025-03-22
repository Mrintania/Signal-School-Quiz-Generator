import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 });

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

    // Create a cache key from the URL and any query parameters
    const cacheKey = `${req.originalUrl}`;
    
    // Check if we have a cached response for this request
    const cachedResponse = cache.get(cacheKey);
    
    if (cachedResponse) {
      // Return the cached response
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json(cachedResponse);
    }

    // Store the original json method
    const originalJson = res.json;
    
    // Override the json method to cache the response before sending
    res.json = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Caching response for: ${cacheKey}`);
        cache.set(cacheKey, body, ttl);
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
  const keys = cache.keys();
  
  const matchingKeys = keys.filter(key => 
    key.includes(pattern)
  );
  
  if (matchingKeys.length > 0) {
    console.log(`Invalidating cache keys: ${matchingKeys.join(', ')}`);
    matchingKeys.forEach(key => cache.del(key));
  }
};

export default { cacheMiddleware, invalidateCache, cache };