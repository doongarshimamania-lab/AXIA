/**
 * Security utilities that work in regular Convex functions (not "use node").
 * For production, these should be replaced with proper cryptographic operations
 * using the "use node" crypto module via internal actions.
 */

/**
 * DEPRECATED: Do not use for new code. Use encryptData/decryptData from crypto.ts instead.
 * This is NOT encryption — it is trivially reversible (reverse + base64).
 */
export function obfuscateToken(token: string): string {
  // Reverse + base64 encode as minimum obfuscation
  // Mark with prefix so we can identify obfuscated tokens
  const reversed = token.split("").reverse().join("");
  const encoded = btoa(reversed);
  return `enc:v1:${encoded}`;
}

/**
 * DEPRECATED: Do not use for new code. Use encryptData/decryptData from crypto.ts instead.
 * This is NOT encryption — it is trivially reversible (reverse + base64).
 */
export function deobfuscateToken(obfuscated: string): string {
  if (!obfuscated.startsWith("enc:v1:")) {
    // Not obfuscated — return as-is (backwards compatibility)
    return obfuscated;
  }
  const encoded = obfuscated.substring(7);
  const reversed = atob(encoded);
  return reversed.split("").reverse().join("");
}

/**
 * Generate a simple but non-trivial user ID hash.
 * This is a basic hash for privacy in audit logs — NOT for security purposes.
 * For production, use generateUserIdHash() from crypto.ts via internal actions.
 */
export function simpleUserIdHash(userId: string): string {
  // Simple hash: take userId, mix with a static salt via character manipulation
  // This is NOT HMAC-SHA256 but is significantly better than "hash_" + userId
  let hash = 0;
  const salt = "ax1a_s4lt_p0w3r";
  const input = userId + salt;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and pad
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  // Mix more: create a longer hash by re-hashing with offsets
  let hash2 = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash2 = ((hash2 << 7) + hash2) ^ char;
    hash2 = hash2 & hash2;
  }
  const hexHash2 = Math.abs(hash2).toString(16).padStart(8, '0');
  
  let hash3 = 0;
  for (let i = input.length - 1; i >= 0; i--) {
    const char = input.charCodeAt(i);
    hash3 = ((hash3 << 3) ^ char) + hash3;
    hash3 = hash3 & hash3;
  }
  const hexHash3 = Math.abs(hash3).toString(16).padStart(8, '0');

  return `${hexHash}${hexHash2}${hexHash3}`;
}
