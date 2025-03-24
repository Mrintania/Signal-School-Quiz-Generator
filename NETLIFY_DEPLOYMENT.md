# Netlify Deployment Guide for Signal School Quiz Generator

This guide outlines the steps to deploy the Signal School Quiz Generator to Netlify.

## Prerequisites

- A Netlify account
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Backend API deployed and accessible (e.g., on Render, Heroku, AWS, etc.)

## Deployment Steps

### 1. Connect to Git Repository

1. Log in to Netlify
2. Click "Add new site" > "Import an existing project"
3. Connect to your Git provider and select your repository

### 2. Configure Build Settings

In the Netlify deploy settings, configure:

- Base directory: `frontend`
- Build command: `npm run netlify-build` or `CI=false npm run build`
- Publish directory: `build`

### 3. Configure Environment Variables

Add the following environment variables in Netlify (Site settings > Environment variables):

```
REACT_APP_API_URL=https://your-backend-api-url.com/api
```

Replace the URL with your actual backend API endpoint.

### 4. Deploy

Click "Deploy site" and wait for the build process to complete.

### 5. Set up Custom Domain (Optional)

1. In Netlify, go to Site settings > Domain management
2. Click "Add custom domain"
3. Follow the instructions to set up your domain and SSL

## Troubleshooting

### Build Fails

If the build fails due to ESLint errors:
- Make sure you're using the `netlify-build` script which sets `CI=false`
- Or add an environment variable `CI=false` in your build settings

### API Connection Issues

If the frontend can't connect to your backend:
- Verify your `REACT_APP_API_URL` is correct
- Ensure CORS is properly configured on your backend
- Check that your backend is running and accessible

### Routing Issues

If routes don't work after refreshing:
- Verify that the `_redirects` file is in the `public` folder
- Check the `netlify.toml` configuration for the redirects section

## Backend Deployment

Remember that Netlify only deploys the frontend. Your backend needs to be deployed separately to a service like:

- Render
- Heroku
- AWS Lambda
- Google Cloud Functions
- Digital Ocean

Make sure to update the `REACT_APP_API_URL` environment variable with your backend URL after deployment.