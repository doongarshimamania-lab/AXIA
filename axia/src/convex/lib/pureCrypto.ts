// ──────────────────────────────────────────────────────────────────────────────
// lib/pureCrypto.ts — Pure-JS SHA-256 + HMAC-SHA256 + constant-time compare.
//
// WHY: Convex's default query/mutation runtime is a V8 isolate that does NOT
// expose Node's `crypto` module. Only actions with `"use node"` can use Node
// built-ins. We need HMAC-SHA256 in queries/mutations (for JWT verify) so we
// can't use `"use node"`. Web Crypto API (`crypto.subtle`) IS available but
// it's async-only — awkward for the JWT verify path which is currently sync.
//
// This module is a fixed, dependency-free SHA-256 + HMAC-SHA256 implementation
// that runs in any JS runtime (Convex default, browser, Node, Bun, CF Workers).
// It's ~120 lines, well-tested against NIST test vectors. DO NOT MODIFY
// without re-running the self-checks at the bottom.
//
// References:
//   - FIPS 180-4 (SHA-256)
//   - RFC 2104 (HMAC)
//   - NIST test vectors: csrc.nist.gov/csrc/media/projects/cryptographic-standards-and-guidelines/documents/examples/sha256.pdf
// ──────────────────────────────────────────────────────────────────────────────

// ponytail: removed "use node" — this module is pure JS, runs in default runtime.

// ─── SHA-256 CONSTANTS ────────────────────────────────────────────────────────
// Round constants: first 32 bits of the fractional parts of the cube roots
// of the first 64 prime numbers. (FIPS 180-4 §4.2.2)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

// Initial hash values: first 32 bits of the fractional parts of the square
// roots of the first 8 prime numbers. (FIPS 180-4 §5.3.3)
const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function toBytes(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  // UTF-8 encode — TextEncoder is available in all JS runtimes
  return new TextEncoder().encode(input);
}

// ─── SHA-256 ──────────────────────────────────────────────────────────────────

export function sha256(input: string | Uint8Array): Uint8Array {
  const msg = toBytes(input);
  const len = msg.length;

  // Pre-processing: padding the message
  // total length after padding = len + 1 (0x80) + k zeros + 8 (length) ≡ 0 mod 64
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[len] = 0x80;
  // Append 64-bit big-endian bit length (we only handle lengths < 2^32 bits,
  // which is 512 MB — way beyond any JWT)
  const bitLen = len * 8;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 4, bitLen >>> 0, false);
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

  // Initialize hash state
  const h = new Uint32Array(H0);

  // Process each 512-bit (64-byte) block
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    // Copy block into first 16 words, big-endian
    for (let i = 0; i < 16; i++) {
      w[i] = dv.getUint32(offset + i * 4, false);
    }
    // Extend the first 16 words into the remaining 48 words
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    // Initialize working variables from current hash state
    let [a, b, c, d, e, f, g, h8] = h;

    // Compression function main loop
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h8 + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h8 = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Add the compressed chunk to the current hash value
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + h8) >>> 0;
  }

  // Produce the final hash value (big-endian)
  const out = new Uint8Array(32);
  const outDv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outDv.setUint32(i * 4, h[i], false);
  }
  return out;
}

export function sha256Hex(input: string | Uint8Array): string {
  const bytes = sha256(input);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── HMAC-SHA256 ──────────────────────────────────────────────────────────────
// RFC 2104. Key is padded/hashed to block size (64 bytes for SHA-256).

export function hmacSha256(key: string | Uint8Array, message: string | Uint8Array): Uint8Array {
  const keyBytes = toBytes(key);
  const msgBytes = toBytes(message);

  // Keys longer than block size are hashed first
  let blockKey: Uint8Array;
  if (keyBytes.length > 64) {
    blockKey = sha256(keyBytes);
  } else {
    blockKey = new Uint8Array(64);
    blockKey.set(keyBytes);
  }

  // ipad / opad (RFC 2104 §2)
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = blockKey[i] ^ 0x36;
    opad[i] = blockKey[i] ^ 0x5c;
  }

  // inner = H(ipad || message)
  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(ipad);
  inner.set(msgBytes, 64);
  const innerHash = sha256(inner);

  // outer = H(opad || inner)
  const outer = new Uint8Array(64 + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, 64);
  return sha256(outer);
}

// ─── CONSTANT-TIME COMPARE ────────────────────────────────────────────────────
// Pure-JS constant-time equality check. Iterates over the FULL length of both
// buffers regardless of early mismatch, so timing doesn't leak the position of
// the first difference. Length IS leaked (unavoidable in pure JS) — callers
// should ensure both inputs are the same length before calling.

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ─── SELF-CHECK ───────────────────────────────────────────────────────────────
// Runs once per cold start. Verifies our pure-JS implementation matches NIST
// published test vectors. If this throws, the implementation is broken and
// JWT verification will fail — fail loudly at boot, not silently at verify time.

if (!globalThis.__PURE_CRYPTO_CHECKED__) {
  globalThis.__PURE_CRYPTO_CHECKED__ = true;

  // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
  const shaAbc = sha256Hex("abc");
  if (shaAbc !== "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad") {
    throw new Error(
      `pureCrypto self-check FAILED: sha256("abc") returned ${shaAbc}, expected NIST vector.`,
    );
  }

  // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  const shaEmpty = sha256Hex("");
  if (shaEmpty !== "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
    throw new Error(
      `pureCrypto self-check FAILED: sha256("") returned ${shaEmpty}, expected NIST vector.`,
    );
  }

  // HMAC-SHA256 RFC 4231 Test Case 2:
  //   key = "Jefe", data = "what do ya want for nothing?"
  //   expected = 5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843
  const hmacRfc = Array.from(hmacSha256("Jefe", "what do ya want for nothing?"))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hmacRfc !== "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843") {
    throw new Error(
      `pureCrypto self-check FAILED: HMAC-SHA256 RFC 4231 test case 2 returned ${hmacRfc}.`,
    );
  }
}
