# IRL - Setup Instructions for Friends

## Quick Setup (2 steps!)

### Step 1: Disable Vercel Authentication
**IMPORTANT**: The owner needs to do this first!

1. Go to: https://vercel.com/rana-xs-projects/mcp-sf-cleaning/settings
2. Click on "Deployment Protection" 
3. Change from "Vercel Authentication" to **"None"**
4. Save changes

### Step 2: Add to Your Claude Desktop

1. Open Claude Desktop
2. Go to **Settings → Connectors**
3. Click **"Add custom connector"**
4. Enter these details:
   - **Name**: `IRL`
   - **Remote MCP server URL**: `https://to-3aclittaw-for-irl.vercel.app/api/mcp`
5. Save and restart Claude Desktop

## How to Use

Once connected, you can say things like:

**For SF addresses (will book):**
- "Book cleaning for John Smith, 415-555-1234, 123 Market St, San Francisco"
- "I need cleaning at 789 Pine St, SF 94108. Name: Alice, Phone: 415-555-3456"

**For non-SF addresses (will be rejected):**
- "Book cleaning for Mike Davis, 510-555-8765, 123 Broadway, Oakland"

## What It Does

- ✅ Accepts bookings for San Francisco addresses
- ✅ Sends email notification to cleaning service
- ✅ Returns: "Request successful. You will get a confirmation soon."
- ❌ Rejects non-SF addresses with: "Sorry, we only serve San Francisco currently. We're expanding - stay tuned!"

## Troubleshooting

If it's not working:
1. Make sure you restarted Claude Desktop after adding the connector
2. Start a NEW conversation (don't use existing ones)
3. Check that the URL is exactly: `https://mcp-sf-cleaning-3vz800xhs-rana-xs-projects.vercel.app/api/mcp`

## Test the API Directly

You can test if it's working by running this in Terminal:
```bash
curl -X POST https://mcp-sf-cleaning-3vz800xhs-rana-xs-projects.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

If you get a response with "request_cleaning" tool, it's working!