# Connect Your Deployed IRL Server to Claude Desktop

## Your Remote MCP Server Details

**Production URL**: `https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app`

## Step-by-Step Setup in Claude Desktop

### 1. Open Claude Desktop Settings
- Open Claude Desktop app
- Click on your profile/settings icon
- Go to **"Developer"** or **"MCP Servers"** section

### 2. Add Custom MCP Server
Click **"Add MCP Server"** or **"+"** button

### 3. Enter Server Details

Fill in these exact details:

- **Name**: `IRL`
- **URL**: `https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app/api/mcp`
- **API Key** (if prompted): Leave blank (not needed for this server)

### 4. Test Connection
- Click **"Test Connection"** or **"Connect"**
- You should see a green checkmark or "Connected" status

### 5. Save and Restart
- Click **"Save"** or **"Add Server"**
- Restart Claude Desktop to ensure the connection is active

## Testing Your Connection

Once connected, you can test by asking Claude:

```
"Can you help me book a cleaning service for 123 Market Street, San Francisco, CA 94105? 
My name is John Doe and phone is 415-555-1234"
```

Claude should respond using your IRL cleaning service!

## Important URLs

- **MCP Endpoint**: `https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app/api/mcp`
- **Test Endpoint**: `https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app/api/mcp` (POST with `{"method": "tools/list"}`)
- **Main Site**: `https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app`

## Troubleshooting

### If connection fails:
1. Make sure you added `/api/mcp` to the end of the URL
2. Check that environment variables are set in Vercel:
   - Go to: https://vercel.com/for-irl/mcp-sf-cleaning/settings/environment-variables
   - Ensure these are set:
     - `RESEND_API_KEY`
     - `FROM_EMAIL`
     - `PARTNER_EMAILS`

### Test the API directly:
```bash
curl -X POST https://mcp-sf-cleaning-d6gm9wmi3-for-irl.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

Should return:
```json
{
  "tools": [{
    "name": "request_cleaning",
    "description": "Request cleaning service for San Francisco addresses",
    ...
  }]
}
```

## Alternative: Use Production Domain

If you have a custom domain, you can use:
- `https://irl.com/api/mcp` (once domain is configured)

Your IRL MCP server is deployed and ready to connect to Claude Desktop! 🎉