# Setting Up Vercel Auto-Deployment from GitHub

Your repository is now on GitHub at: https://github.com/Rana-X/mcp-sf-cleaning

## Steps to Connect GitHub to Vercel for Auto-Deployment:

### 1. Go to Vercel Dashboard
Visit https://vercel.com/dashboard

### 2. Import Git Repository
- Click "Add New..." → "Project"
- Select "Import Git Repository"
- Choose "GitHub" as the provider
- Authorize Vercel to access your GitHub (if not already done)

### 3. Select Your Repository
- Find and select `mcp-sf-cleaning` from the list
- Click "Import"

### 4. Configure Project Settings
- **Framework Preset**: Other (or None)
- **Root Directory**: `.` (leave as is)
- **Build Command**: Leave empty (no build needed)
- **Output Directory**: Leave as default
- **Install Command**: `npm install`

### 5. Set Environment Variables
Add these environment variables in the Vercel dashboard:
- `RESEND_API_KEY`: re_BcASVtoX_Bj4QhZei4xSjyyLr21vhMbVd
- `FROM_EMAIL`: gwen@irl-concierge.com
- `PARTNER_EMAILS`: ranadaytoday@outlook.com
- `E2B_API_KEY`: e2b_32c59020e4d98601f6dce36a12b17382cbc6f3d9

### 6. Deploy
- Click "Deploy"
- Vercel will automatically deploy from your GitHub main branch

## Auto-Deployment Features

Once connected:
- ✅ **Automatic Deployments**: Every push to `main` branch triggers a new deployment
- ✅ **Preview Deployments**: Every pull request gets its own preview URL
- ✅ **Rollback**: Easy rollback to previous deployments
- ✅ **Environment Variables**: Securely managed in Vercel dashboard
- ✅ **Custom Domain**: Can add custom domains in Vercel settings

## GitHub Workflow

After setup, your workflow will be:
```bash
# Make changes locally
git add .
git commit -m "Your commit message"
git push origin main

# Vercel automatically deploys within 1-2 minutes
```

## Monitoring Deployments

1. **GitHub**: See deployment status in GitHub repo under "Environments"
2. **Vercel Dashboard**: View all deployments at https://vercel.com/dashboard
3. **Deployment URL**: Each deployment gets a unique URL like:
   - Production: `mcp-sf-cleaning.vercel.app`
   - Preview: `mcp-sf-cleaning-<hash>.vercel.app`

## Benefits of This Setup

1. **No Manual Deployment**: Just push to GitHub
2. **CI/CD Pipeline**: Tests run on GitHub Actions, deploys run on Vercel
3. **Version Control**: Every deployment is tied to a git commit
4. **Collaboration**: Team members can create PRs with preview deployments
5. **Zero Downtime**: New deployments don't affect existing ones until ready

Your repository is ready for Vercel auto-deployment! 🚀