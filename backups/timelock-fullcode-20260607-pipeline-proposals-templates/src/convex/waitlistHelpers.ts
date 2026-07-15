// Helper functions for waitlist referral system

/**
 * Generate a unique 6-character referral code
 */
export function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Calculate new position based on referral count
 * Each referral moves the user up by 1 position (minimum position is 1)
 */
export function calculatePosition(basePosition: number, referralCount: number): number {
  return Math.max(1, basePosition - referralCount);
}

/**
 * Generate referral link for a user
 */
export function generateReferralLink(referralCode: string): string {
  // Use the site URL from environment or default to localhost
  const baseUrl = process.env.SITE_URL || "http://localhost:5173";
  return `${baseUrl}/?ref=${referralCode}`;
}
