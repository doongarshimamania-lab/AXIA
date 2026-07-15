"use node";

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import crypto from "crypto";

// Get platform secret from environment — lazy validation so module doesn't crash at import
function getPlatformSecret(): string {
  const key = process.env.PLATFORM_SECRET_KEY;
  if (!key) throw new Error("SECURITY: PLATFORM_SECRET_KEY environment variable is not set. Refusing to start with insecure defaults.");
  return key;
}

function getJwtSecret(): string {
  const key = process.env.JWT_SECRET_KEY;
  if (!key) throw new Error("SECURITY: JWT_SECRET_KEY environment variable is not set. Refusing to start with insecure defaults.");
  return key;
}

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("SECURITY: ENCRYPTION_KEY environment variable is not set. Refusing to start with insecure defaults.");
  return key;
}

/**
 * Generate HMAC-SHA256 hash for user ID
 * Format: user_id_hash = HMAC-SHA256(user_uuid, platform_secret)
 */
export function generateUserIdHash(userId: string): string {
  const hmac = crypto.createHmac("sha256", getPlatformSecret());
  hmac.update(userId);
  return hmac.digest("hex");
}

/**
 * Verify user ID hash matches expected value
 */
export function verifyUserIdHash(userId: string, hash: string): boolean {
  const expectedHash = generateUserIdHash(userId);
  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, "hex"),
    Buffer.from(hash, "hex")
  );
}

/**
 * Generate JWT token with embedded user_id_hash
 */
export function generateJWT(payload: Record<string, any>, expiresIn: string = "5m"): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = expiresIn === "5m" ? 300 : 3600;

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode JWT token. Constant-time signature comparison.
 */
export function verifyJWT(token: string): Record<string, any> | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    const expectedSignature = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    // Constant-time comparison to prevent timing attacks on token forgery.
    // Buffers must be equal length; if not, the token is malformed anyway.
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Encrypt data using AES-256-GCM (simulated)
 */
export function encryptData(data: any, key?: string): string {
  const encKey = key ?? getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(encKey.padEnd(32, "0").slice(0, 32)),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    data: encrypted.toString("hex"),
    authTag: authTag.toString("hex"),
  });
}

/**
 * Decrypt data using AES-256-GCM (simulated)
 */
export function decryptData(encrypted: string, key?: string): any {
  try {
    const decKey = key ?? getEncryptionKey();
    const { iv, data, authTag } = JSON.parse(encrypted);
    
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(decKey.padEnd(32, "0").slice(0, 32)),
      Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, "hex")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Generate SHA-256 hash for compliance certificates
 */
export function generateCertificateHash(data: any): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
}