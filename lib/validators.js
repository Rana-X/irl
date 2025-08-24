// Input validation and sanitization functions

/**
 * Sanitize a string by removing HTML tags and special characters
 * @param {any} str - Input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export const sanitizeString = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  
  // More aggressive HTML tag removal
  let cleaned = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove style tags and content
    .replace(/<[^>]*>/g, '')  // Remove remaining HTML tags
    .replace(/[<>\"']/g, '')   // Remove special characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')   // Remove event handlers
    .trim()
    .slice(0, maxLength);
    
  return cleaned;
};

/**
 * Validate and format US phone number
 * @param {any} phone - Phone number to validate
 * @returns {{valid: boolean, cleaned: string|null}} Validation result
 */
export const validatePhone = (phone) => {
  if (typeof phone !== 'string') {
    return { valid: false, cleaned: null };
  }
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle international format (+1 prefix)
  if (cleaned.length === 11 && cleaned[0] === '1') {
    cleaned = cleaned.slice(1); // Remove country code
  }
  
  // Check if it's exactly 10 digits
  if (cleaned.length !== 10) {
    return { valid: false, cleaned: null };
  }
  
  // Check if it starts with valid area code (not 0 or 1)
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return { valid: false, cleaned: null };
  }
  
  // Reject if the cleaned number starts with a minus (negative number)
  if (phone.trim().startsWith('-')) {
    return { valid: false, cleaned: null };
  }
  
  // Format as XXX-XXX-XXXX
  const formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  return { valid: true, cleaned: formatted };
};

/**
 * Validate if address is in San Francisco
 * @param {any} address - Address to validate
 * @returns {boolean} True if address appears to be in SF
 */
export const validateSFAddress = (address) => {
  if (typeof address !== 'string') return false;
  
  const addr = address.toLowerCase();
  
  // SF text indicators
  const sfIndicators = [
    'sf',
    'san francisco',
    'sanfrancisco',
    's.f.',
    'san fran'
  ];
  
  const hasSFText = sfIndicators.some(indicator => {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${indicator.replace('.', '\\.')}\\b`);
    return regex.test(addr);
  });
  
  // Check for SF zip codes (94102-94188)
  const hasSFZip = /\b94(1[0-8]\d|0\d{2})\b/.test(addr);
  
  return hasSFText || hasSFZip;
};

/**
 * Validate customer name
 * @param {any} name - Name to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
export const validateName = (name) => {
  if (typeof name !== 'string') {
    return { valid: false, reason: 'Name must be a string' };
  }
  
  const cleaned = name.trim();
  
  if (cleaned.length < 2) {
    return { valid: false, reason: 'Name too short' };
  }
  
  if (cleaned.length > 100) {
    return { valid: false, reason: 'Name too long' };
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  // But reject SQL injection attempts
  if (!/^[a-zA-Z\s\-']+$/.test(cleaned)) {
    return { valid: false, reason: 'Name contains invalid characters' };
  }
  
  // Additional check for SQL injection patterns
  if (cleaned.includes('--') || cleaned.includes('/*') || cleaned.includes('*/') || 
      cleaned.includes(';') || cleaned.toLowerCase().includes('drop') ||
      cleaned.toLowerCase().includes('delete') || cleaned.toLowerCase().includes('union')) {
    return { valid: false, reason: 'Name contains invalid characters' };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(cleaned)) {
    return { valid: false, reason: 'Name must contain letters' };
  }
  
  return { valid: true };
};

/**
 * Validate email format
 * @param {any} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const basicValid = emailRegex.test(email.trim());
  
  if (!basicValid) return false;
  
  // Additional checks
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  
  // Check local part
  if (local.length > 64) return false;
  
  // Check domain
  if (domain.length > 255) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;
  
  return true;
};

/**
 * Rate limiting implementation
 */
export class RateLimiter {
  constructor(limit = 10, windowMs = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  /**
   * Check if request should be allowed
   * @param {string} identifier - Unique identifier (e.g., IP address)
   * @returns {boolean} True if request is allowed
   */
  checkLimit(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Filter out old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.limit) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
    
    return true;
  }
  
  /**
   * Clean up old entries from memory
   */
  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const recent = requests.filter(time => now - time < this.windowMs);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
  
  /**
   * Reset limits for an identifier
   * @param {string} identifier - Identifier to reset
   */
  reset(identifier) {
    this.requests.delete(identifier);
  }
  
  /**
   * Get remaining requests for an identifier
   * @param {string} identifier - Identifier to check
   * @returns {number} Number of remaining requests
   */
  getRemaining(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.limit - recentRequests.length);
  }
}