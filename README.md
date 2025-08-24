# IRL - SF Cleaning Service

IRL - A Model Context Protocol (MCP) server for booking cleaning services in San Francisco. Can be deployed locally or to Vercel for remote access.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Resend API

1. **Create Resend Account**: Go to https://resend.com and sign up
2. **Get API Key**: 
   - Navigate to your Resend Dashboard
   - Go to "API Keys" section
   - Create a new API key or copy your existing one
   - It will look like: `re_BcASVtoX_Bj4QhZei4xSjyyLr21vhMbVd`

3. **Verify Domain (Required for custom email)**:
   - To send from gwen@irl-concierge.com
   - Go to "Domains" in Resend Dashboard
   - Add domain: irl-concierge.com
   - Follow DNS verification steps (add TXT, MX records)
   - Once verified, you can send from gwen@irl-concierge.com

### 3. Configure Email Credentials
Edit `.env` file with your Resend credentials:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
FROM_EMAIL=gwen@irl-concierge.com
PARTNER_EMAILS=partner1@example.com,partner2@example.com
```

**Note:** You must verify the domain `irl-concierge.com` in Resend before you can send from `gwen@irl-concierge.com`. Until verified, use `onboarding@resend.dev` for testing.

### 4. Configure Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sf-cleaning": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-sf-cleaning/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/mcp-sf-cleaning/index.js` with the actual path to your index.js file.

### 5. Restart Claude Desktop

After configuration, restart Claude Desktop to load the MCP server.

## Vercel Deployment (For Remote Access)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Set Environment Variables
```bash
cd /Users/rana/Downloads/IRL/mcp-sf-cleaning

# Set up Vercel environment variables
vercel env add RESEND_API_KEY
# Enter: re_BcASVtoX_Bj4QhZei4xSjyyLr21vhMbVd

vercel env add FROM_EMAIL  
# Enter: gwen@irl-concierge.com

vercel env add PARTNER_EMAILS
# Enter: ranadaytoday@outlook.com
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

Follow the prompts:
- Set up and deploy? Y
- Which scope? (select your account)
- Link to existing project? N
- Project name? irl
- Directory? ./
- Want to modify settings? N

### 4. Get Your MCP Server URL
After deployment, you'll get a URL like:
```
https://mcp-sf-cleaning.vercel.app
```

### 5. Add to Claude Desktop as Custom Connector

1. Open Claude Desktop
2. Go to Settings → Connectors
3. Click "Add custom connector"
4. Enter:
   - **Name**: SF Cleaning Service
   - **Remote MCP server URL**: `https://mcp-sf-cleaning.vercel.app/api/mcp`
5. Save and restart Claude

### Testing the Remote Server
You can test the API directly:
```bash
# List tools
curl -X POST https://mcp-sf-cleaning.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'

# Request cleaning (SF address)
curl -X POST https://mcp-sf-cleaning.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "request_cleaning",
      "arguments": {
        "name": "John Doe",
        "phone": "415-555-1234",
        "address": "123 Market St, SF 94105"
      }
    }
  }'
```

## Test Conversation Examples

### Example 1: San Francisco Address (Accepted)
```
You: Can you book a cleaning service for me?
Claude: I'll help you book a cleaning service. I'll need your name, phone number, and address.

You: Name is John Doe, phone is 415-555-0123, address is 123 Market St, San Francisco, CA 94105
Claude: [Uses request_cleaning tool]
Result: ✅ Sent! John Doe, they'll call 415-555-0123 within 1 hour.
```

### Example 2: Non-SF Address (Rejected)
```
You: Book cleaning for Sarah Smith, 510-555-9876, 456 Broadway, Oakland, CA 94607
Claude: [Uses request_cleaning tool]
Result: Sorry, we only serve San Francisco currently. We're expanding - stay tuned!
```

### Example 3: SF Zip Code Detection
```
You: I need cleaning at 789 Pine Street, 94108. Name: Alice Wong, Phone: 415-555-3456
Claude: [Uses request_cleaning tool]
Result: ✅ Sent! Alice Wong, they'll call 415-555-3456 within 1 hour.
```

## Usage

The server provides one tool:
- `request_cleaning`: Books cleaning service for SF addresses only

### Parameters:
- `name`: Customer name
- `phone`: Contact phone number  
- `address`: Service address (must be in San Francisco)

### Responses:
- **SF Address**: "✅ Sent! [name], they'll call [phone] within 1 hour."
- **Non-SF Address**: "Sorry, we only serve San Francisco currently. We're expanding - stay tuned!"

## How It Works

1. Checks if address contains "sf", "san francisco", or SF zip codes (940xx, 941xx)
2. If in SF: Sends email via Resend API to partners and confirms booking
3. If not in SF: Returns polite rejection message

## Why Resend?

- **Simple API**: Clean, modern email API designed for developers
- **No SMTP hassles**: No need for app passwords or complex SMTP settings
- **Better deliverability**: Built-in SPF, DKIM, and DMARC support
- **Free tier**: 3,000 emails/month free, perfect for small projectsTest auto-deployment
