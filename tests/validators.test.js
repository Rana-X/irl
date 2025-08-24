import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  sanitizeString,
  validatePhone,
  validateSFAddress,
  validateName,
  validateEmail,
  RateLimiter
} from '../lib/validators.js';

describe('Input Sanitization', () => {
  describe('sanitizeString', () => {
    test('removes HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('Hello');
      expect(sanitizeString('<div>Test</div>')).toBe('Test');
      expect(sanitizeString('Hello<br/>World')).toBe('HelloWorld');
    });

    test('removes special characters', () => {
      expect(sanitizeString('Hello"World"')).toBe('HelloWorld');
      expect(sanitizeString("Test'Quote'")).toBe('TestQuote');
      expect(sanitizeString('<>Test<>')).toBe('Test');
    });

    test('handles non-string inputs', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
    });

    test('respects max length', () => {
      const longString = 'a'.repeat(300);
      expect(sanitizeString(longString, 100)).toHaveLength(100);
      expect(sanitizeString(longString)).toHaveLength(200);
    });

    test('trims whitespace', () => {
      expect(sanitizeString('  Hello  ')).toBe('Hello');
      expect(sanitizeString('\n\tTest\n\t')).toBe('Test');
    });

    test('handles SQL injection attempts', () => {
      expect(sanitizeString("'; DROP TABLE users; --")).toBe('; DROP TABLE users; --');
      expect(sanitizeString('1 OR 1=1')).toBe('1 OR 1=1');
    });
  });
});

describe('Phone Validation', () => {
  describe('validatePhone', () => {
    test('validates correct US phone numbers', () => {
      expect(validatePhone('4155551234')).toEqual({ valid: true, cleaned: '415-555-1234' });
      expect(validatePhone('415-555-1234')).toEqual({ valid: true, cleaned: '415-555-1234' });
      expect(validatePhone('(415) 555-1234')).toEqual({ valid: true, cleaned: '415-555-1234' });
      expect(validatePhone('415.555.1234')).toEqual({ valid: true, cleaned: '415-555-1234' });
      expect(validatePhone('+1 415 555 1234')).toEqual({ valid: true, cleaned: '415-555-1234' });
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhone('123')).toEqual({ valid: false, cleaned: null });
      expect(validatePhone('12345678901')).toEqual({ valid: false, cleaned: null }); // 11 digits
      expect(validatePhone('123456789')).toEqual({ valid: false, cleaned: null }); // 9 digits
      expect(validatePhone('0155551234')).toEqual({ valid: false, cleaned: null }); // starts with 0
      expect(validatePhone('1155551234')).toEqual({ valid: false, cleaned: null }); // starts with 1
    });

    test('handles non-string inputs', () => {
      expect(validatePhone(null)).toEqual({ valid: false, cleaned: null });
      expect(validatePhone(undefined)).toEqual({ valid: false, cleaned: null });
      expect(validatePhone(4155551234)).toEqual({ valid: false, cleaned: null });
      expect(validatePhone({})).toEqual({ valid: false, cleaned: null });
    });

    test('handles international formats', () => {
      expect(validatePhone('+14155551234')).toEqual({ valid: true, cleaned: '415-555-1234' });
      expect(validatePhone('14155551234')).toEqual({ valid: false, cleaned: null }); // 11 digits
      expect(validatePhone('+1 (415) 555-1234')).toEqual({ valid: true, cleaned: '415-555-1234' });
    });

    test('handles text in phone field', () => {
      expect(validatePhone('call me')).toEqual({ valid: false, cleaned: null });
      expect(validatePhone('415-FLOWERS')).toEqual({ valid: false, cleaned: null });
    });
  });
});

describe('SF Address Validation', () => {
  describe('validateSFAddress', () => {
    test('accepts valid SF addresses with city name', () => {
      expect(validateSFAddress('123 Market St, San Francisco, CA')).toBe(true);
      expect(validateSFAddress('456 Pine St, SF, CA')).toBe(true);
      expect(validateSFAddress('789 Broadway, S.F., California')).toBe(true);
      expect(validateSFAddress('1 Main St, San Fran')).toBe(true);
      expect(validateSFAddress('sanfrancisco')).toBe(true);
    });

    test('accepts valid SF zip codes', () => {
      expect(validateSFAddress('123 Market St, 94102')).toBe(true);
      expect(validateSFAddress('456 Pine St, 94105')).toBe(true);
      expect(validateSFAddress('789 Broadway, 94188')).toBe(true);
      expect(validateSFAddress('1 Main St, 94000')).toBe(true);
    });

    test('rejects non-SF addresses', () => {
      expect(validateSFAddress('123 Main St, Oakland, CA')).toBe(false);
      expect(validateSFAddress('456 Broadway, San Jose, CA')).toBe(false);
      expect(validateSFAddress('789 Pine St, Berkeley, 94704')).toBe(false);
      expect(validateSFAddress('1 Market St, 95000')).toBe(false);
    });

    test('handles non-string inputs', () => {
      expect(validateSFAddress(null)).toBe(false);
      expect(validateSFAddress(undefined)).toBe(false);
      expect(validateSFAddress(123)).toBe(false);
      expect(validateSFAddress({})).toBe(false);
    });

    test('avoids false positives', () => {
      expect(validateSFAddress('123 Satisfy St, Oakland')).toBe(false); // contains 'sf' but not SF
      expect(validateSFAddress('456 Transfer Ave, Berkeley')).toBe(false); // contains 'sf' but not SF
    });

    test('case insensitive matching', () => {
      expect(validateSFAddress('123 Market St, SAN FRANCISCO')).toBe(true);
      expect(validateSFAddress('456 Pine St, sAn FrAnCiScO')).toBe(true);
    });
  });
});

describe('Name Validation', () => {
  describe('validateName', () => {
    test('accepts valid names', () => {
      expect(validateName('John Doe')).toEqual({ valid: true });
      expect(validateName('Mary-Jane Smith')).toEqual({ valid: true });
      expect(validateName("O'Connor")).toEqual({ valid: true });
      expect(validateName('Jo')).toEqual({ valid: true });
      expect(validateName('Jean-Claude Van Damme')).toEqual({ valid: true });
    });

    test('rejects invalid names', () => {
      expect(validateName('J')).toEqual({ valid: false, reason: 'Name too short' });
      expect(validateName('')).toEqual({ valid: false, reason: 'Name too short' });
      expect(validateName('   ')).toEqual({ valid: false, reason: 'Name too short' });
      expect(validateName('a'.repeat(101))).toEqual({ valid: false, reason: 'Name too long' });
    });

    test('rejects names with invalid characters', () => {
      expect(validateName('John123')).toEqual({ valid: false, reason: 'Name contains invalid characters' });
      expect(validateName('Jane@Doe')).toEqual({ valid: false, reason: 'Name contains invalid characters' });
      expect(validateName('<script>alert</script>')).toEqual({ valid: false, reason: 'Name contains invalid characters' });
      expect(validateName('Robert; DROP TABLE')).toEqual({ valid: false, reason: 'Name contains invalid characters' });
    });

    test('handles non-string inputs', () => {
      expect(validateName(null)).toEqual({ valid: false, reason: 'Name must be a string' });
      expect(validateName(undefined)).toEqual({ valid: false, reason: 'Name must be a string' });
      expect(validateName(123)).toEqual({ valid: false, reason: 'Name must be a string' });
    });

    test('requires at least one letter', () => {
      expect(validateName('---')).toEqual({ valid: false, reason: 'Name must contain letters' });
      expect(validateName("''")).toEqual({ valid: false, reason: 'Name must contain letters' });
    });
  });
});

describe('Email Validation', () => {
  describe('validateEmail', () => {
    test('accepts valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('first+last@example.org')).toBe(true);
      expect(validateEmail('test_email@sub.domain.com')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@.com')).toBe(false);
      expect(validateEmail('test@domain..com')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
    });

    test('handles non-string inputs', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validateEmail(123)).toBe(false);
      expect(validateEmail({})).toBe(false);
    });

    test('rejects emails with invalid lengths', () => {
      const longLocal = 'a'.repeat(65) + '@example.com';
      expect(validateEmail(longLocal)).toBe(false);
      
      const longDomain = 'test@' + 'a'.repeat(256) + '.com';
      expect(validateEmail(longDomain)).toBe(false);
    });
  });
});

describe('Rate Limiter', () => {
  let rateLimiter;
  
  beforeEach(() => {
    rateLimiter = new RateLimiter(3, 1000); // 3 requests per second for testing
  });

  test('allows requests within limit', () => {
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
  });

  test('blocks requests exceeding limit', () => {
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(false);
    expect(rateLimiter.checkLimit('user1')).toBe(false);
  });

  test('tracks different users separately', () => {
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user2')).toBe(true);
    expect(rateLimiter.checkLimit('user2')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(false);
    expect(rateLimiter.checkLimit('user2')).toBe(true);
    expect(rateLimiter.checkLimit('user2')).toBe(false);
  });

  test('resets after time window', (done) => {
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(true);
    expect(rateLimiter.checkLimit('user1')).toBe(false);
    
    setTimeout(() => {
      expect(rateLimiter.checkLimit('user1')).toBe(true);
      done();
    }, 1100);
  });

  test('getRemaining returns correct count', () => {
    expect(rateLimiter.getRemaining('user1')).toBe(3);
    rateLimiter.checkLimit('user1');
    expect(rateLimiter.getRemaining('user1')).toBe(2);
    rateLimiter.checkLimit('user1');
    expect(rateLimiter.getRemaining('user1')).toBe(1);
    rateLimiter.checkLimit('user1');
    expect(rateLimiter.getRemaining('user1')).toBe(0);
  });

  test('reset clears user limits', () => {
    rateLimiter.checkLimit('user1');
    rateLimiter.checkLimit('user1');
    rateLimiter.checkLimit('user1');
    expect(rateLimiter.checkLimit('user1')).toBe(false);
    
    rateLimiter.reset('user1');
    expect(rateLimiter.checkLimit('user1')).toBe(true);
  });

  test('cleanup removes old entries', () => {
    const limiter = new RateLimiter(1, 100); // 100ms window
    limiter.checkLimit('user1');
    expect(limiter.requests.has('user1')).toBe(true);
    
    setTimeout(() => {
      limiter.cleanup();
      expect(limiter.requests.has('user1')).toBe(false);
    }, 150);
  });
});