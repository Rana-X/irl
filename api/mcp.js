import { Resend } from 'resend';

// Initialize Resend with validation
const initResend = () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('[ERROR] Missing RESEND_API_KEY environment variable');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// Rate limiting store (in production, use Redis or similar)
const requestStore = new Map();
const RATE_LIMIT = 10; // 10 requests
const RATE_WINDOW = 60000; // per minute

// Check rate limit
const checkRateLimit = (ip) => {
  const now = Date.now();
  const userRequests = requestStore.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  requestStore.set(ip, recentRequests);
  return true;
};

// Validate and sanitize input
const sanitizeString = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  // Remove any HTML/script tags and trim
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\"']/g, '')
    .trim()
    .slice(0, maxLength);
};

// Validate phone number (US format)
const validatePhone = (phone) => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone (10 digits)
  if (cleaned.length !== 10) {
    return { valid: false, cleaned: null };
  }
  
  // Format as XXX-XXX-XXXX
  const formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  return { valid: true, cleaned: formatted };
};

// Validate address is in SF
const validateSFAddress = (address) => {
  const addr = address.toLowerCase();
  const sfIndicators = [
    'sf',
    'san francisco',
    'sanfrancisco'
  ];
  
  // Check for SF indicators
  const hasSFText = sfIndicators.some(indicator => addr.includes(indicator));
  
  // Check for SF zip codes (940xx, 941xx)
  const hasSFZip = /94[01]\d{2}/.test(addr);
  
  return hasSFText || hasSFZip;
};

// Log request for monitoring
const logRequest = (method, ip, data, success) => {
  const log = {
    timestamp: new Date().toISOString(),
    method,
    ip,
    success,
    data: data ? { name: data.name, hasPhone: !!data.phone, hasAddress: !!data.address } : null
  };
  console.log('[REQUEST]', JSON.stringify(log));
};

export default async function handler(req, res) {
  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.socket?.remoteAddress || 
                   'unknown';

  // Set security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    logRequest('INVALID_METHOD', clientIp, null, false);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    logRequest('RATE_LIMITED', clientIp, null, false);
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }

  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    logRequest('INVALID_BODY', clientIp, null, false);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Limit request size (Vercel has 4.5MB limit, but we'll be strict)
  if (JSON.stringify(req.body).length > 10000) {
    logRequest('BODY_TOO_LARGE', clientIp, null, false);
    return res.status(413).json({ error: 'Request too large' });
  }

  const { method, params } = req.body;

  // Handle initialize request
  if (method === 'initialize') {
    return res.json({
      protocolVersion: '0.1.0',
      serverName: 'IRL',
      serverVersion: '1.0.0',
      metadata: {
        icon: 'https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app/irl-logo.svg',
        displayName: 'IRL',
        description: 'SF Concierge'
      }
    });
  }

  // Handle list_tools request
  if (method === 'tools/list') {
    logRequest('tools/list', clientIp, null, true);
    return res.json({
      tools: [{
        name: 'request_cleaning',
        description: 'Request cleaning service in San Francisco',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Customer name' },
            phone: { type: 'string', description: 'Phone number' },
            address: { type: 'string', description: 'Service address' }
          },
          required: ['name', 'phone', 'address']
        }
      }]
    });
  }

  // Handle tool call
  if (method === 'tools/call' && params?.name === 'request_cleaning') {
    try {
      const { name, phone, address } = params.arguments || {};
      
      // Validate required fields
      if (!name || !phone || !address) {
        logRequest('tools/call', clientIp, params.arguments, false);
        return res.status(400).json({ 
          error: 'Missing required fields: name, phone, and address' 
        });
      }

      // Sanitize inputs
      const cleanName = sanitizeString(name, 100);
      const cleanAddress = sanitizeString(address, 200);
      
      // Validate name
      if (cleanName.length < 2) {
        logRequest('tools/call', clientIp, { name: 'INVALID' }, false);
        return res.status(400).json({ 
          error: 'Invalid name provided' 
        });
      }

      // Validate phone
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        logRequest('tools/call', clientIp, { phone: 'INVALID' }, false);
        return res.status(400).json({ 
          error: 'Invalid phone number. Please provide a 10-digit US phone number.' 
        });
      }

      // Check if address is in SF
      if (!validateSFAddress(cleanAddress)) {
        logRequest('tools/call', clientIp, { address: 'NOT_SF' }, true);
        return res.json({ 
          content: [{ 
            type: 'text', 
            text: "Sorry, we only serve San Francisco currently. We're expanding - stay tuned!" 
          }]
        });
      }

      // Initialize Resend
      const resend = initResend();
      if (!resend) {
        logRequest('tools/call', clientIp, { error: 'RESEND_INIT' }, false);
        return res.status(500).json({ 
          error: 'Email service temporarily unavailable' 
        });
      }

      // Validate environment variables
      const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
      const partnerEmails = process.env.PARTNER_EMAILS || 'ranadaytoday@outlook.com';
      
      // Send email with proper error handling
      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: partnerEmails.split(',').map(email => email.trim()),
        subject: 'Cleaning Request - SF',
        text: `New cleaning service request:

Customer Details:
- Name: ${cleanName}
- Phone: ${phoneValidation.cleaned}
- Address: ${cleanAddress}

Request Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}

Please contact the customer within 1 hour.`,
        html: `
<h2>New Cleaning Service Request</h2>
<p><strong>Customer Details:</strong></p>
<ul>
  <li><strong>Name:</strong> ${cleanName}</li>
  <li><strong>Phone:</strong> ${phoneValidation.cleaned}</li>
  <li><strong>Address:</strong> ${cleanAddress}</li>
</ul>
<p><strong>Request Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
<p><em>Please contact the customer within 1 hour.</em></p>
        `
      });

      // Check if email was sent successfully
      if (emailResult.error) {
        console.error('[EMAIL_ERROR]', emailResult.error);
        logRequest('tools/call', clientIp, { error: 'EMAIL_SEND' }, false);
        return res.status(500).json({ 
          error: 'Failed to send booking request. Please try again.' 
        });
      }

      logRequest('tools/call', clientIp, { name: cleanName }, true);
      return res.json({ 
        content: [{ 
          type: 'text', 
          text: 'Successfully booked the maid. Will get confirmation shortly.' 
        }]
      });
      
    } catch (error) {
      console.error('[CRITICAL_ERROR]', error);
      logRequest('tools/call', clientIp, { error: error.message }, false);
      
      // Don't expose internal errors to client
      return res.status(500).json({ 
        error: 'Service temporarily unavailable. Please try again.' 
      });
    }
  }

  // Unknown method
  logRequest('UNKNOWN_METHOD', clientIp, { method }, false);
  return res.status(400).json({ error: 'Unknown method' });
}