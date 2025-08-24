# Deploy to Vercel Instructions

Your MCP server is ready to deploy! Follow these steps:

## Manual Deployment

1. **Open Terminal and navigate to project:**
   ```bash
   cd /Users/rana/Downloads/IRL/mcp-sf-cleaning
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```
   - Choose "Continue with Email" or your preferred method
   - Follow the authentication steps

3. **Deploy the project:**
   ```bash
   vercel --prod
   ```
   
   When prompted:
   - Set up and deploy? **Y**
   - Which scope? **Select your account**
   - Link to existing project? **N**
   - Project name? **mcp-sf-cleaning** (or press enter for default)
   - Directory? **./** (press enter)
   - Want to modify settings? **N**

4. **Set environment variables:**
   After deployment, run these commands:
   ```bash
   vercel env add RESEND_API_KEY production
   # Paste: re_BcASVtoX_Bj4QhZei4xSjyyLr21vhMbVd

   vercel env add FROM_EMAIL production
   # Paste: onboarding@resend.dev

   vercel env add PARTNER_EMAILS production
   # Paste: ranadaytoday@outlook.com
   ```

5. **Redeploy with environment variables:**
   ```bash
   vercel --prod
   ```

## Your Deployment URL

After deployment, you'll get a URL like:
```
https://mcp-sf-cleaning-[username].vercel.app
```

## Add to Claude Desktop

1. Open Claude Desktop
2. Go to Settings → Connectors
3. Click "Add custom connector"
4. Enter:
   - **Name**: SF Cleaning Service
   - **Remote MCP server URL**: `https://[your-url].vercel.app/api/mcp`
5. Save and restart Claude

## Test Your Deployment

Test the API directly in terminal:
```bash
# Replace [your-url] with your actual Vercel URL
curl -X POST https://[your-url].vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

## Environment Variables Reference

- `RESEND_API_KEY`: re_BcASVtoX_Bj4QhZei4xSjyyLr21vhMbVd
- `FROM_EMAIL`: onboarding@resend.dev  
- `PARTNER_EMAILS`: ranadaytoday@outlook.com