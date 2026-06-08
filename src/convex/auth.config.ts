// Auth provider configuration for OAuth providers
// Credential providers (Password, Email OTP) are configured in auth.ts
// OAuth providers are configured here and picked up automatically by Convex Auth
//
// To enable Google OAuth:
//   1. Create OAuth credentials at https://console.cloud.google.com/apis/credentials
//   2. Set redirect URL to: https://<your-convex-site>/api/auth/callback/google
//   3. Set env vars: npx convex env set AUTH_GOOGLE_ID <client-id>
//                    npx convex env set AUTH_GOOGLE_SECRET <client-secret>
//   4. Uncomment the Google provider entry below
//
// To enable GitHub OAuth:
//   1. Create OAuth App at https://github.com/settings/developers
//   2. Set callback URL to: https://<your-convex-site>/api/auth/callback/github
//   3. Set env vars: npx convex env set AUTH_GITHUB_ID <client-id>
//                    npx convex env set AUTH_GITHUB_SECRET <client-secret>
//   4. Uncomment the GitHub provider entry below

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
    // Google OAuth - uncomment after setting AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET env vars
    // {
    //   domain: "accounts.google.com",
    //   applicationID: process.env.AUTH_GOOGLE_ID as string,
    // },
    // GitHub OAuth - uncomment after setting AUTH_GITHUB_ID and AUTH_GITHUB_SECRET env vars
    // {
    //   domain: "github.com",
    //   applicationID: process.env.AUTH_GITHUB_ID as string,
    // },
  ],
};
