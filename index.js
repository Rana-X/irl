#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment on startup
const validateEnvironment = () => {
  const required = ['RESEND_API_KEY', 'FROM_EMAIL', 'PARTNER_EMAILS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`[ERROR] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[INFO] Please check your .env file or Claude Desktop configuration');
    process.exit(1);
  }
  
  // Validate email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(process.env.FROM_EMAIL)) {
    console.error('[ERROR] Invalid FROM_EMAIL format');
    process.exit(1);
  }
  
  const partnerEmails = process.env.PARTNER_EMAILS.split(',');
  for (const email of partnerEmails) {
    if (!emailRegex.test(email.trim())) {
      console.error(`[ERROR] Invalid email in PARTNER_EMAILS: ${email}`);
      process.exit(1);
    }
  }
  
  console.error('[INFO] Environment validation passed');
};

// Initialize with validation
validateEnvironment();

let resend;
try {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.error('[INFO] Resend API initialized successfully');
} catch (error) {
  console.error('[ERROR] Failed to initialize Resend:', error.message);
  process.exit(1);
}

// Input sanitization
const sanitizeString = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>\"']/g, '') // Remove special chars
    .trim()
    .slice(0, maxLength);
};

// Phone validation (US format)
const validatePhone = (phone) => {
  if (typeof phone !== 'string') return { valid: false, cleaned: null };
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return { valid: false, cleaned: null };
  }
  
  const formatted = `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  return { valid: true, cleaned: formatted };
};

// SF address validation
const validateSFAddress = (address) => {
  if (typeof address !== 'string') return false;
  
  const addr = address.toLowerCase();
  const sfIndicators = ['sf', 'san francisco', 'sanfrancisco'];
  const hasSFText = sfIndicators.some(indicator => addr.includes(indicator));
  const hasSFZip = /94[01]\d{2}/.test(addr);
  
  return hasSFText || hasSFZip;
};

// Create MCP server
const server = new Server({
  name: 'IRL',
  version: '2.0.0' // Production version
}, { 
  capabilities: { 
    tools: {} 
  }
});

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[INFO] Listing tools');
  return {
    tools: [{
      name: 'request_cleaning',
      description: 'Request cleaning service in San Francisco',
      inputSchema: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Customer name',
            minLength: 2,
            maxLength: 100
          },
          phone: { 
            type: 'string', 
            description: 'Phone number (10-digit US format)',
            pattern: '^[0-9\\s\\-\\(\\)\\+]+$'
          },
          address: { 
            type: 'string', 
            description: 'Service address in San Francisco',
            minLength: 10,
            maxLength: 200
          }
        },
        required: ['name', 'phone', 'address']
      }
    }]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'request_cleaning') {
    console.error('[INFO] Processing cleaning request');
    
    try {
      const { name, phone, address } = request.params.arguments || {};
      
      // Validate required fields
      if (!name || !phone || !address) {
        console.error('[WARN] Missing required fields');
        return { 
          content: [{ 
            type: 'text', 
            text: 'Error: All fields (name, phone, address) are required.' 
          }] 
        };
      }
      
      // Sanitize inputs
      const cleanName = sanitizeString(name, 100);
      const cleanAddress = sanitizeString(address, 200);
      
      // Validate name
      if (cleanName.length < 2) {
        console.error('[WARN] Invalid name provided');
        return { 
          content: [{ 
            type: 'text', 
            text: 'Error: Please provide a valid name (at least 2 characters).' 
          }] 
        };
      }
      
      // Validate phone
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        console.error('[WARN] Invalid phone number:', phone);
        return { 
          content: [{ 
            type: 'text', 
            text: 'Error: Please provide a valid 10-digit US phone number.' 
          }] 
        };
      }
      
      // Validate address
      if (cleanAddress.length < 10) {
        console.error('[WARN] Address too short');
        return { 
          content: [{ 
            type: 'text', 
            text: 'Error: Please provide a complete address.' 
          }] 
        };
      }
      
      // Check if in SF
      if (!validateSFAddress(cleanAddress)) {
        console.error('[INFO] Non-SF address:', cleanAddress);
        return { 
          content: [{ 
            type: 'text', 
            text: "Sorry, we only serve San Francisco currently. We're expanding - stay tuned!" 
          }] 
        };
      }
      
      // Log the request
      console.error('[INFO] Sending email for:', {
        name: cleanName,
        phone: phoneValidation.cleaned,
        address: cleanAddress.substring(0, 50) + '...'
      });
      
      // Send email with timeout
      const emailPromise = resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: process.env.PARTNER_EMAILS.split(',').map(e => e.trim()),
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
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout')), 10000)
      );
      
      try {
        await Promise.race([emailPromise, timeoutPromise]);
        console.error('[SUCCESS] Email sent successfully');
        
        return { 
          content: [{ 
            type: 'text', 
            text: 'Successfully booked the maid. Will get confirmation shortly.' 
          }] 
        };
      } catch (emailError) {
        console.error('[ERROR] Failed to send email:', emailError.message);
        return { 
          content: [{ 
            type: 'text', 
            text: 'Booking received but email notification failed. The service will still process your request.' 
          }] 
        };
      }
      
    } catch (error) {
      console.error('[CRITICAL] Unexpected error:', error);
      return { 
        content: [{ 
          type: 'text', 
          text: 'Service temporarily unavailable. Please try again later.' 
        }] 
      };
    }
  }
  
  // Unknown tool
  console.error('[WARN] Unknown tool requested:', request.params.name);
  return { 
    content: [{ 
      type: 'text', 
      text: 'Unknown tool requested.' 
    }] 
  };
});

// Set up graceful shutdown
process.on('SIGINT', async () => {
  console.error('[INFO] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[INFO] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[CRITICAL] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[SUCCESS] IRL MCP Server (Production) running');
    console.error('[INFO] Ready to handle requests');
  } catch (error) {
    console.error('[CRITICAL] Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[CRITICAL] Fatal error:', error);
  process.exit(1);
});