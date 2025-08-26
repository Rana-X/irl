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
      capabilities: {
        tools: true
      },
      metadata: {
        icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPCEtLSBCYWNrZ3JvdW5kIENpcmNsZSB3aXRoIEluc3RhZ3JhbSBHcmFkaWVudCAtLT4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iaW5zdGFncmFtR3JhZGllbnQiIHgxPSIwJSIgeTE9IjEwMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojRkVENTc2O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjI1JSIgc3R5bGU9InN0b3AtY29sb3I6I0Y0NzEzMztzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI1MCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNCQzMwODE7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzRDNjNEMjtzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8ZmlsdGVyIGlkPSJzaGFkb3ciIHg9Ii01MCUiIHk9Ii01MCUiIHdpZHRoPSIyMDAlIiBoZWlnaHQ9IjIwMCUiPgogICAgICA8ZmVHYXVzc2lhbkJsdXIgaW49IlNvdXJjZUFscGhhIiBzdGREZXZpYXRpb249IjMiLz4KICAgICAgPGZlT2Zmc2V0IGR4PSIwIiBkeT0iMiIgcmVzdWx0PSJvZmZzZXRibHVyIi8+CiAgICAgIDxmZUZsb29kIGZsb29kLWNvbG9yPSIjMDAwMDAwIiBmbG9vZC1vcGFjaXR5PSIwLjIiLz4KICAgICAgPGZlQ29tcG9zaXRlIGluMj0ib2Zmc2V0Ymx1ciIgb3BlcmF0b3I9ImluIi8+CiAgICAgIDxmZU1lcmdlPgogICAgICAgIDxmZU1lcmdlTm9kZS8+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIi8+CiAgICAgIDwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICAKICA8IS0tIFJvdW5kZWQgU3F1YXJlIEJhY2tncm91bmQgKEluc3RhZ3JhbSBTdHlsZSkgLS0+CiAgPHJlY3QgeD0iMjAiIHk9IjIwIiB3aWR0aD0iMjE2IiBoZWlnaHQ9IjIxNiIgcng9IjU0IiByeT0iNTQiIGZpbGw9InVybCgjaW5zdGFncmFtR3JhZGllbnQpIi8+CiAgCiAgPCEtLSBXaGl0ZSBJbm5lciBCb3JkZXIgLS0+CiAgPHJlY3QgeD0iMzAiIHk9IjMwIiB3aWR0aD0iMTk2IiBoZWlnaHQ9IjE5NiIgcng9IjQ0IiByeT0iNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgb3BhY2l0eT0iMC4zIi8+CiAgCiAgPCEtLSBJUkwgVGV4dCBpbiBJbnN0YWdyYW0tbGlrZSBGb250IChCb2xkLCBTYW5zLXNlcmlmKSAtLT4KICA8dGV4dCB4PSIxMjgiIHk9IjE1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsdGVyPSJ1cmwoI3NoYWRvdykiPklSTDwvdGV4dD4KICAKICA8IS0tIERlY29yYXRpdmUgRWxlbWVudHMgLS0+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iOCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuNCIvPgogIDxjaXJjbGUgY3g9IjIwNiIgY3k9IjUwIiByPSI4IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC40Ii8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSIyMDYiIHI9IjgiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz4KICA8Y2lyY2xlIGN4PSIyMDYiIGN5PSIyMDYiIHI9IjgiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz4KPC9zdmc+',
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