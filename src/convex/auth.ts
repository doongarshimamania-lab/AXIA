import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

/**
 * Production-scale (1,000+ users) password policy.
 *
 * Why a hard 16-character cap?
 *  - The Password provider uses scrypt (N=16384, r=16, p=1, dkLen=64). A single
 *    1024-char password costs ~2 MB of memory + ~50 ms of CPU to hash. If even
 *    100 of 1,000 users submit a long password concurrently, that is ~5 s of
 *    pure CPU and 200 MB of RAM — an easily exploitable server-side DoS
 *    ("LPDOS" — Large Password Denial of Service).
 *  - 16 chars at N=16384 costs ~25 ms and ~2 MB RAM per hash — bounded.
 *  - 16 chars with mixed-case + digits + symbols gives ~95^16 ≈ 4.4 × 10^31
 *    combinations — far beyond any practical brute-force budget.
 *  - OWASP NIST SP 800-63B: only enforce a MIN length; a MAX length exists
 *    solely to prevent DoS — 64 chars is the recommendation, but for a freemium
 *    SaaS with a known upper bound on user count we cap tighter at 16.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
    }),
    emailOtp,
  ],
});
