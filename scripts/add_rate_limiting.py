#!/usr/bin/env python3
"""
add_rate_limiting.py — AXIA v5.5.0

Inserts `rateLimitAuthenticated(ctx, "<name>")` (or `rateLimit` by email for
auth flows) as the first statement of every mutation handler that doesn't
already have a rate-limit call.

Mechanism:
  1. Parse each `*.ts` file in src/convex/.
  2. For each `export const <name> = mutation({ args: { ... }, handler: async (ctx, args?) => {`
     pattern, check if the handler body already calls `rateLimit(` or
     `requireAdmin(`.
  3. If not, insert `await rateLimitAuthenticated(ctx, "<name>");\n    ` after
     the opening brace of the handler body.
  4. Add `import { rateLimitAuthenticated, RATE_LIMITS } from ".../security/rateLimit";`
     at the top of the file (if not already imported).
  5. For mutations whose name starts with signIn/signUp/resetPassword/forgotPassword,
     use `RATE_LIMITS.SIGN_IN` instead of DEFAULT.

Idempotent: running twice produces no further changes.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/axia/src/convex")

# Match the start of a mutation definition (without trying to span the whole args block,
# which has nested braces). We capture the mutation name and find the handler body separately.
MUTATION_START_PATTERN = re.compile(
    r'export\s+const\s+(\w+)\s*=\s*mutation\s*\(',
)
ACTION_START_PATTERN = re.compile(
    r'export\s+const\s+(\w+)\s*=\s*action\s*\(',
)

# After matching the start, we look for the handler signature and its opening brace.
HANDLER_BODY_START_PATTERN = re.compile(
    r'handler\s*:\s*async\s*\(\s*ctx\s*(?:,\s*\w+\s*)?\)\s*=>\s*\{',
)

# Heuristic for auth-flow mutations — these should be rate-limited by EMAIL, not userId
AUTH_FLOW_NAMES = {"signIn", "signUp", "resetPassword", "forgotPassword", "requestOtp", "verifyOtp", "resendOtp"}

# Skip files where adding rate limiting would break (admin-only paths already gated)
SKIP_FILES = {
    "adminListAll.ts",     # already requireAdmin'd
    "adminSeed.ts",        # already requireAdmin'd
    "seedTeamUsers.ts",    # already requireAdmin'd
    "seed.ts",             # dev-only seed
    "seedNew.ts",          # dev-only seed
    "autoSeed.ts",         # auto-seed (system)
    "adminListAll.ts",
    "seedProjects.ts",     # dev-only seed
    "security/rateLimit.ts",  # the helper itself
}

# For mutations starting with these prefixes, use SIGN_IN limits
AUTH_PREFIXES = ("signIn", "signUp", "resetPassword", "forgotPassword", "requestOtp", "verifyOtp", "resendOtp", "sendOtp")


def file_already_imports(text: str) -> bool:
    return "from " in text and "security/rateLimit" in text


def add_import(text: str, file_path: Path) -> str:
    """Add the rate-limit import to the top of the file (after the last existing import)."""
    if file_already_imports(text):
        return text
    # Find the position after the last `import ... from "...";` line
    import_lines = list(re.finditer(r'^import\s+.*?from\s+["\'].*?["\'];\s*$', text, re.MULTILINE))
    if not import_lines:
        # No imports — insert at top
        return 'import { rateLimitAuthenticated, RATE_LIMITS } from "./security/rateLimit";\n' + text
    last_import = import_lines[-1]
    pos = last_import.end()
    # Determine relative path from this file to security/rateLimit
    # If file is in a subdirectory like `messaging/`, the import needs `../security/rateLimit`
    rel = Path("security/rateLimit")
    # Compute path from file's directory
    file_dir = file_path.parent
    # src/convex is the root for these imports
    if file_dir != ROOT:
        # Compute relative path from file_dir to ROOT/security/rateLimit
        rel_from_file = Path("..") / "security" / "rateLimit" if file_dir.parent == ROOT else Path("../.." ) / "security" / "rateLimit"
        # Simplify: count how many levels deep file is
        levels = len(file_dir.relative_to(ROOT).parts)
        rel_from_file = Path(*([".."] * levels)) / "security" / "rateLimit"
        import_path = str(rel_from_file).replace("\\", "/")
    else:
        import_path = "./security/rateLimit"
    import_line = f'\nimport {{ rateLimitAuthenticated, RATE_LIMITS }} from "{import_path}";'
    return text[:pos] + import_line + text[pos:]


def handler_has_ratelimit(handler_body: str) -> bool:
    """Check if the handler body (first ~500 chars after `{`) already calls rateLimit/requireAdmin."""
    snippet = handler_body[:500]
    return "rateLimit(" in snippet or "requireAdmin(" in snippet or "rateLimitAuthenticated(" in snippet


def patch_file(path: Path) -> int:
    """Patch all mutations in a file. Returns # of patches applied."""
    if path.name in SKIP_FILES:
        return 0
    if "_generated" in str(path):
        return 0
    text = path.read_text()
    original = text
    patches = 0

    # Find all mutations in order; process from end to start so positions don't shift
    start_matches = list(MUTATION_START_PATTERN.finditer(text))
    if not start_matches:
        return 0

    # For each mutation start, find the handler body opening brace
    # Build a list of (name, body_start_pos) tuples
    mutation_bodies = []
    for m in start_matches:
        name = m.group(1)
        # Search forward from the mutation start for the handler body opening
        handler_m = HANDLER_BODY_START_PATTERN.search(text, m.end())
        if not handler_m:
            continue
        # body_start = position right after `{`
        body_start = handler_m.end()
        mutation_bodies.append((name, body_start))

    if not mutation_bodies:
        return 0

    # Process in reverse order to keep positions valid
    for name, body_start in reversed(mutation_bodies):
        # Skip whitespace/newlines after `{`
        i = body_start
        while i < len(text) and text[i] in " \t\n":
            i += 1

        # Capture the first ~500 chars to check for existing rate limit
        handler_snippet = text[i:i+500]
        if handler_has_ratelimit(handler_snippet):
            continue

        # The mutation name might be an auth-flow
        is_auth_flow = any(name.startswith(p) for p in AUTH_PREFIXES)

        # Determine indentation — match the existing line's leading whitespace
        # by looking at the line before body_start
        line_start = text.rfind("\n", 0, i) + 1
        indent_match = re.match(r"[ \t]*", text[line_start:i])
        indent = indent_match.group(0) if indent_match else "    "

        # Construct the rate-limit call
        if is_auth_flow:
            stmt = f"await rateLimit(ctx, \"{name}\", args.email ?? \"anon\", RATE_LIMITS.SIGN_IN);\n{indent}"
        else:
            stmt = f"await rateLimitAuthenticated(ctx, \"{name}\");\n{indent}"

        # Insert
        text = text[:i] + stmt + text[i:]
        patches += 1

    if patches > 0:
        # Add import if not present
        text = add_import(text, path)
        if text != original:
            path.write_text(text)

    return patches


def main() -> int:
    print("=" * 72)
    print("AXIA v5.5.0 — adding rate limiting to all unprotected mutations")
    print("=" * 72)

    total = 0
    files = sorted(ROOT.rglob("*.ts"))
    for f in files:
        n = patch_file(f)
        if n:
            rel = f.relative_to(ROOT)
            print(f"  {str(rel):50s} {n:3d} mutations rate-limited")
            total += n

    print(f"\n  → Total mutations rate-limited: {total}")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
