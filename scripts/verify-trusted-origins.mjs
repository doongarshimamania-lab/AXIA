// ponytail: one runnable check that fails if the wildcard origin matching
// breaks. Import Better Auth's actual matchesOriginPattern and verify the
// origins we care about are accepted by the patterns we ship in trustedOriginsList.
//
// Run: node /home/z/my-project/scripts/verify-trusted-origins.mjs

import { matchesOriginPattern } from "/home/z/my-project/axia/node_modules/better-auth/dist/auth/trusted-origins.mjs";

const patterns = [
  "https://*.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://axia-bay.vercel.app", // simulated SITE_URL
];

const mustAccept = [
  "https://axia-bay.vercel.app",
  "https://axia-git-fork-xyz.vercel.app",
  "https://axia-pr-123.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const mustReject = [
  "https://evil.example.com",
  "https://phishing.vercel.app.evil.com", // suffix trick — must NOT match
  "http://localhost:3000.evil.com",
  "https://attacker.com",
  "",
];

let failures = 0;
console.log("--- MUST ACCEPT ---");
for (const url of mustAccept) {
  const ok = patterns.some((p) => matchesOriginPattern(url, p));
  console.log(`${ok ? "PASS" : "FAIL"}  ${url}`);
  if (!ok) failures++;
}
console.log("--- MUST REJECT ---");
for (const url of mustReject) {
  const ok = patterns.some((p) => matchesOriginPattern(url, p));
  // For empty string, we want patterns to NOT match (so ok should be false)
  const wantReject = !ok;
  console.log(`${wantReject ? "PASS" : "FAIL"}  ${url}  (matched=${ok})`);
  if (!wantReject) failures++;
}

console.log("---");
if (failures === 0) {
  console.log("All checks passed.");
  process.exit(0);
} else {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
