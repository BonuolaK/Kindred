# Kindred Deployment Instructions

## Google Authentication Configuration

The app has been updated to support Google Sign-in using the production domain (www.getkindred.app) while maintaining backward compatibility with Replit preview domains.

### What was changed

1. The Google OAuth callback URL now intelligently decides which domain to use:
   - In production: Uses `www.getkindred.app`
   - In development: Uses the Replit preview domain
   - Supports manual override through an environment variable

### Setting up for deployment

When deploying to production, you'll need to ensure the following:

1. Set the environment variable `NODE_ENV=production` to use the production domain for Google Auth
2. Alternatively, you can explicitly set `AUTH_CALLBACK_DOMAIN=www.getkindred.app` for more control

### Google OAuth Configuration in Google Cloud Console

After deployment, make sure to:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project > APIs & Services > Credentials
3. Edit the OAuth 2.0 Client ID used for Kindred
4. Add the production domain to the authorized JavaScript origins:
   - `https://www.getkindred.app`
5. Add the production callback URL to the authorized redirect URIs:
   - `https://www.getkindred.app/api/auth/google/callback`

This will ensure the Google Sign-in flow works correctly on the production site.

### Troubleshooting

If you encounter issues with Google Sign-in on the production site:

1. Check that the environment variables are set correctly
2. Verify that the domains are correctly configured in the Google Cloud Console
3. Check server logs for the actual callback URL being used
4. Make sure your Google API credentials are properly set in the environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
