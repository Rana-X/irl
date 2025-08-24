import { describe, test, expect } from '@jest/globals';
import { 
  sanitizeString, 
  validatePhone, 
  validateSFAddress, 
  validateName,
  validateEmail,
  RateLimiter 
} from '../lib/validators.js';

describe('Edge Cases and Boundary Testing', () => {
  describe('sanitizeString edge cases', () => {
    test('handles empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
      expect(sanitizeString('\n\t')).toBe('');
    });
    
    test('handles very long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = sanitizeString(longString);
      expect(result.length).toBe(200); // Default max length
    });
    
    test('handles custom max length', () => {
      const result = sanitizeString('hello world', 5);
      expect(result).toBe('hello');
    });
    
    test('handles mixed content', () => {
      const mixed = 'Hello <script>alert("test")</script> World';
      expect(sanitizeString(mixed)).toBe('Hello  World');
    });
    
    test('handles nested tags', () => {
      const nested = '<div><script><div>test</div></script></div>';
      expect(sanitizeString(nested)).toBe('');
    });
    
    test('handles broken HTML', () => {
      const broken = '<div>Test<script>alert(';
      const result = sanitizeString(broken);
      expect(result).not.toContain('<');
      expect(result).not.toContain('script');
    });
  });
  
  describe('validatePhone edge cases', () => {
    test('handles phone with extensions', () => {
      expect(validatePhone('415-555-1234 ext 123')).toEqual({ 
        valid: true, 
        cleaned: '415-555-1234' 
      });
    });
    
    test('handles phone with country code variations', () => {
      expect(validatePhone('1-415-555-1234')).toEqual({ 
        valid: true, 
        cleaned: '415-555-1234' 
      });
      expect(validatePhone('001-415-555-1234')).toEqual({ 
        valid: false, 
        cleaned: null 
      });
    });
    
    test('handles phone with special formatting', () => {
      expect(validatePhone('(415)555-1234')).toEqual({ 
        valid: true, 
        cleaned: '415-555-1234' 
      });
      expect(validatePhone('415•555•1234')).toEqual({ 
        valid: true, 
        cleaned: '415-555-1234' 
      });
    });
    
    test('rejects invalid area codes', () => {
      expect(validatePhone('011-555-1234')).toEqual({ 
        valid: false, 
        cleaned: null 
      });
      expect(validatePhone('111-555-1234')).toEqual({ 
        valid: false, 
        cleaned: null 
      });
    });
  });
  
  describe('validateSFAddress edge cases', () => {
    test('handles abbreviated formats', () => {
      expect(validateSFAddress('123 Main, S.F.')).toBe(true);
      expect(validateSFAddress('123 Main St., SF 94102')).toBe(true);
    });
    
    test('handles no street address', () => {
      expect(validateSFAddress('San Francisco, CA')).toBe(true);
      expect(validateSFAddress('94102')).toBe(true);
    });
    
    test('handles mixed case', () => {
      expect(validateSFAddress('123 Main, SAN FRANCISCO')).toBe(true);
      expect(validateSFAddress('123 Main, sAn FrAnCiScO')).toBe(true);
    });
    
    test('handles addresses with special characters', () => {
      expect(validateSFAddress('123 O\'Farrell St, SF')).toBe(true);
      expect(validateSFAddress('456 1st Street, San Francisco')).toBe(true);
    });
    
    test('correctly rejects nearby cities', () => {
      expect(validateSFAddress('123 Main St, Daly City, 94014')).toBe(false);
      expect(validateSFAddress('456 Oak Ave, South San Francisco')).toBe(false);
    });
  });
  
  describe('validateName edge cases', () => {
    test('handles hyphenated names', () => {
      expect(validateName('Mary-Jane')).toEqual({ valid: true });
      expect(validateName('Jean-Claude')).toEqual({ valid: true });
    });
    
    test('handles names with apostrophes', () => {
      expect(validateName("O'Connor")).toEqual({ valid: true });
      expect(validateName("D'Angelo")).toEqual({ valid: true });
    });
    
    test('handles single letter names', () => {
      expect(validateName('X')).toEqual({ 
        valid: false, 
        reason: 'Name too short' 
      });
    });
    
    test('handles names at length boundaries', () => {
      expect(validateName('Jo')).toEqual({ valid: true }); // Minimum valid
      expect(validateName('J')).toEqual({ 
        valid: false, 
        reason: 'Name too short' 
      });
      const longName = 'A'.repeat(100);
      expect(validateName(longName)).toEqual({ valid: true });
      const tooLongName = 'A'.repeat(101);
      expect(validateName(tooLongName)).toEqual({ 
        valid: false, 
        reason: 'Name too long' 
      });
    });
    
    test('rejects names with numbers', () => {
      expect(validateName('John123')).toEqual({ 
        valid: false, 
        reason: 'Name contains invalid characters' 
      });
      expect(validateName('123')).toEqual({ 
        valid: false, 
        reason: 'Name contains invalid characters' 
      });
    });
  });
  
  describe('validateEmail edge cases', () => {
    test('handles subdomains', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true);
      expect(validateEmail('user@deep.sub.example.com')).toBe(true);
    });
    
    test('handles special characters in local part', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
      expect(validateEmail('user.name@example.com')).toBe(true);
      expect(validateEmail('user_name@example.com')).toBe(true);
    });
    
    test('rejects malformed emails', () => {
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user@example')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@example .com')).toBe(false);
    });
    
    test('handles edge case lengths', () => {
      const longLocal = 'a'.repeat(64) + '@example.com';
      expect(validateEmail(longLocal)).toBe(true);
      
      const tooLongLocal = 'a'.repeat(65) + '@example.com';
      expect(validateEmail(tooLongLocal)).toBe(false);
      
      const longDomain = 'test@' + 'a'.repeat(253) + '.com';
      expect(validateEmail(longDomain)).toBe(true);
      
      const tooLongDomain = 'test@' + 'a'.repeat(254) + '.com';
      expect(validateEmail(tooLongDomain)).toBe(false);
    });
  });
  
  describe('RateLimiter edge cases', () => {
    test('handles undefined user IDs', () => {
      const limiter = new RateLimiter(5, 1000);
      expect(limiter.checkLimit(undefined)).toBe(true);
      expect(limiter.checkLimit(null)).toBe(true);
    });
    
    test('handles concurrent requests correctly', () => {
      const limiter = new RateLimiter(3, 1000);
      const userId = 'concurrent-user';
      
      // Simulate 3 concurrent requests
      const results = [
        limiter.checkLimit(userId),
        limiter.checkLimit(userId),
        limiter.checkLimit(userId)
      ];
      
      expect(results).toEqual([true, true, true]);
      expect(limiter.checkLimit(userId)).toBe(false);
    });
    
    test('cleanup removes only expired entries', (done) => {
      const limiter = new RateLimiter(1, 100);
      
      limiter.checkLimit('user1');
      limiter.checkLimit('user2');
      
      setTimeout(() => {
        limiter.checkLimit('user3'); // This should not be cleaned
        limiter.cleanup();
        
        // user1 and user2 should be cleaned, user3 should remain
        expect(limiter.requests.has('user1')).toBe(false);
        expect(limiter.requests.has('user2')).toBe(false);
        expect(limiter.requests.has('user3')).toBe(true);
        done();
      }, 150);
    });
  });
});