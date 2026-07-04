// ──────────────────────────────────────────────────────────────────────────────
// lib/scopeCreepDetector.ts — v1 regex-based scope-creep language detection.
//
// WHY REGEX FIRST (not LLM):
//   - 0ms latency, 0 cost, deterministic, fully testable
//   - Catches ~70% of real scope-creep phrases based on our research
//   - LLM (v2, P1) only triggers on high-score messages to classify intent
//
// SCORE CALIBRATION:
//   0-29   = no flags
//   30-69  = "review this" suggestion (yellow)
//   70-100 = "convert to change order" suggestion (red)
//
// PATTERNS are deliberately client-tone-tuned ("quick favor", "while you're at
// it", "just one more") — these are the actual phrases clients use.
// ──────────────────────────────────────────────────────────────────────────────

export interface ScopeCreepResult {
  detected: boolean;
  score: number; // 0-100
  matches: string[]; // human-readable pattern names that matched
}

interface Pattern {
  name: string;
  regex: RegExp;
  score: number; // contribution to total
}

// ponytail: scoring is additive (max 100), patterns are case-insensitive,
// word-boundary guarded so "while you're at it" doesn't match "while you're at item".
const PATTERNS: Pattern[] = [
  // ── Classic scope-creep openers (high confidence) ─────────────────────────
  { name: "just_one_more", regex: /\bjust\s+one\s+more\b/i, score: 35 },
  { name: "quick_favor", regex: /\bquick\s+(?:favor|favour)\b/i, score: 35 },
  { name: "while_youre_at_it", regex: /\bwhile\s+you(?:'re| are)\s+(?:at|on)\s+it\b/i, score: 30 },
  { name: "since_youre_already", regex: /\bsince\s+you(?:'re| are)\s+already\b/i, score: 30 },
  { name: "small_tweak", regex: /\b(?:small|tiny|quick)\s+tweak\b/i, score: 25 },
  { name: "easy_change", regex: /\b(?:super|really)?\s*easy\s+(?:change|fix|add)\b/i, score: 25 },
  { name: "should_be_quick", regex: /\bshould\s+be\s+quick\b/i, score: 25 },

  // ── Scope-expansion phrases (medium confidence) ───────────────────────────
  { name: "can_you_also", regex: /\bcan\s+you\s+also\b/i, score: 20 },
  { name: "could_you_add", regex: /\bcould\s+you\s+(?:also\s+)?add\b/i, score: 20 },
  { name: "while_we_re_at_it", regex: /\bwhile\s+we(?:'re| are)\s+at\s+it\b/i, score: 20 },
  { name: "another_thing", regex: /\banother\s+thing\b/i, score: 20 },
  { name: "one_more_thing", regex: /\bone\s+more\s+thing\b/i, score: 25 },
  { name: "would_be_nice", regex: /\bwould\s+be\s+(?:really\s+)?nice\b/i, score: 15 },
  { name: "if_you_have_time", regex: /\bif\s+you\s+have\s+(?:the\s+)?time\b/i, score: 15 },

  // ── "Free work" tells (medium-high confidence) ────────────────────────────
  { name: "shouldnt_take_long", regex: /\bshouldn'?t\s+take\s+(?:too\s+)?long\b/i, score: 25 },
  { name: "wont_take_much", regex: /\bwon'?t\s+take\s+(?:much|long)\b/i, score: 25 },
  { name: "five_min_job", regex: /\b(?:five|5|ten|10|two|2)\s*(?:-|\s)?\s*min(?:ute)?\s+(?:job|fix|change)\b/i, score: 30 },

  // ── Vague expansion (lower confidence, but flags ambiguity) ───────────────
  { name: "make_it_pop", regex: /\bmake\s+it\s+pop\b/i, score: 15 },
  { name: "jazz_it_up", regex: /\bjazz\s+it\s+up\b/i, score: 15 },
  { name: "modern_look", regex: /\bmake\s+it\s+more\s+modern\b/i, score: 15 },
  { name: "polish_a_bit", regex: /\bpolish(?:\s+it)?\s+(?:up\s+)?a\s+bit\b/i, score: 15 },

  // ── Out-of-original-scope references (high confidence) ────────────────────
  { name: "new_page", regex: /\badd\s+(?:a\s+)?(?:new\s+)?page\b/i, score: 30 },
  { name: "new_section", regex: /\badd\s+(?:a\s+)?(?:new\s+)?section\b/i, score: 30 },
  { name: "new_feature", regex: /\badd\s+(?:a\s+)?(?:new\s+)?feature\b/i, score: 35 },
  { name: "extra_page", regex: /\bextra\s+page\b/i, score: 30 },
  { name: "extra_section", regex: /\bextra\s+section\b/i, score: 30 },
];

const MAX_SCORE = 100;

export function detectScopeCreep(message: string): ScopeCreepResult {
  if (!message || typeof message !== "string") {
    return { detected: false, score: 0, matches: [] };
  }

  const matches: string[] = [];
  let totalScore = 0;

  for (const p of PATTERNS) {
    if (p.regex.test(message)) {
      matches.push(p.name);
      totalScore += p.score;
    }
  }

  // ponytail: cap at 100 so multiple matches don't inflate past "definitely scope creep"
  const score = Math.min(totalScore, MAX_SCORE);
  const detected = score >= 30; // 30+ = "review this" threshold

  return { detected, score, matches };
}

// ─── SELF-CHECK ────────────────────────────────────────────────────────────────
// ponytail: ONE check per non-trivial logic. Verifies detection + scoring cap.

if (process.env.NODE_ENV !== "production" && !globalThis.__SCOPE_CREEP_CHECKED__) {
  globalThis.__SCOPE_CREEP_CHECKED__ = true;

  // Positive cases
  const r1 = detectScopeCreep("Just one more section and we're done!");
  if (!r1.detected || r1.score < 30) throw new Error("scopeCreep self-check FAILED: positive case missed");

  const r2 = detectScopeCreep("Quick favor — can you also add a blog page? Shouldn't take long.");
  if (!r2.detected || r2.matches.length < 3) throw new Error("scopeCreep self-check FAILED: multi-match missed");

  // Negative case
  const r3 = detectScopeCreep("Thanks for the update, looks great.");
  if (r3.detected || r3.score !== 0) throw new Error("scopeCreep self-check FAILED: false positive");

  // Cap at 100
  const r4 = detectScopeCreep("just one more quick favor can you also add a new feature section while you're at it shouldn't take long would be nice five min job");
  if (r4.score > 100) throw new Error("scopeCreep self-check FAILED: score not capped at 100");
}
