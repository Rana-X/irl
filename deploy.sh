#!/bin/bash

# Vercel deployment script with API key
export VERCEL_TOKEN="vck_7sqqEr5m2NOgHf6facgxxStscJxBdez42SXElx9KBaEyET4jQH0cZ1cY"

echo "🚀 Deploying MCP SF Cleaning to Vercel..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Deploy to Vercel with environment variables
vercel --prod --yes \
  --token=$VERCEL_TOKEN \
  --env RESEND_API_KEY="re_BcASVtoX_Bj4QhZei4xSjyyLr21vhMbVd" \
  --env FROM_EMAIL="onboarding@resend.dev" \
  --env PARTNER_EMAILS="ranadaytoday@outlook.com"

echo "✅ Deployment complete!"
echo "📝 Add this URL to Claude Desktop as a custom connector:"
echo "   https://mcp-sf-cleaning.vercel.app/api/mcp"