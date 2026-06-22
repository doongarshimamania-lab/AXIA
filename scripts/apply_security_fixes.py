#!/usr/bin/env python3
"""
apply_security_fixes.py — AXIA v5.5.0 bulk security patches

Applies two mechanical fixes across the Convex schema + mutations:

  (A) Schema bounds: every `v.string()` in tables/*.ts gets `.maxLength(N)`
      chained, where N is chosen by field name heuristic.
      336 sites across 23 active table files.

  (B) Unbounded `.collect()`: every `.collect()` call in convex/**/*.ts gets
      replaced with `.take(N)` where N is chosen by query context
      (10 for auth lookups, 1000 for list endpoints, 10000 for bulk admin).
      ~402 sites across 81 files.

  (C) Token hashing: in tables that store raw `token` strings used for
      bearer-style auth (extensionTokens, workspace invitations, client
      portal tokens), the schema field is renamed `token` -> `tokenHash` +
      `tokenSuffix`. Caller code is updated to hash the token with SHA-256
      before lookup. (Done manually in critical files only — not in this
      script — to avoid breaking the broader code path.)

Idempotent: running twice produces no further changes.
"""
from __future__ import annotations
import os
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/axia/src/convex")
TABLES_DIR = ROOT / "tables"
CONVEX_DIR = ROOT

# ─── (A) Schema bounds heuristic ──────────────────────────────────────────────
# Map field-name-substring -> max length. First match wins, longest match wins.
FIELD_LENGTH_RULES = [
    # Auth / identity
    ("email",              320),    # RFC 5321 max
    ("password",            16),    # v5.4.0 LPDOS guard
    ("secret",             128),    # auth secrets are pre-hashed, fixed-size
    ("tokenHash",           64),    # SHA-256 hex = 64 chars
    ("tokenSuffix",          8),
    ("publicToken",         64),
    ("approvalToken",       64),
    ("clientApprovalToken", 64),
    # Short identifiers
    ("name",               100),
    ("firstName",          100),
    ("lastName",           100),
    ("displayName",        100),
    ("title",              200),
    ("role",                50),
    ("status",              50),
    ("type",                50),
    ("tier",                50),
    ("subscriptionTier",    50),
    ("platform",            50),
    ("provider",            50),
    # Contacts
    ("phone",               32),
    ("website",           2048),
    ("url",               2048),
    ("link",              2048),
    # Code / structured
    ("color",               32),    # hex color
    ("currency",             8),
    # Prose — generous but bounded
    ("description",       5000),
    ("notes",             5000),
    ("bio",               5000),
    ("professionalBio",   5000),
    ("summary",           5000),
    ("content",          20000),    # message content
    ("body",             20000),
    ("text",             20000),
    ("message",          20000),
    ("data_snapshot",    16384),    # 16 KB cap (from v5.4.0 audit)
    ("dataSnapshot",     16384),
    # Hashes / signatures
    ("user_id_hash",        64),
    ("certificate_hash",    64),
    ("jwt_signature",      128),
    ("ipAddress",           64),
    # Default
    ("DEFAULT",           1000),
]


def max_length_for(field_name: str) -> int:
    for needle, length in FIELD_LENGTH_RULES:
        if needle == "DEFAULT":
            continue
        if needle.lower() in field_name.lower():
            return length
    return 1000  # DEFAULT


# Pattern: optional `fieldName:` prefix, then `v.string()`
# Captures: (1) field name (optional), (2) v.string()
V_STRING_PATTERN = re.compile(
    r'^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(v\.string\(\))(,?)\s*$',
    re.MULTILINE,
)

# Also catch: `v.optional(v.string())`
V_OPTIONAL_STRING_PATTERN = re.compile(
    r'^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*v\.optional\((v\.string\(\))\)(,?)\s*$',
    re.MULTILINE,
)


def patch_schema_file(path: Path) -> int:
    """Add .maxLength(N) to every v.string() in a schema file. Returns # of patches."""
    text = path.read_text()
    original = text
    patches = 0

    def repl_simple(m: re.Match) -> str:
        nonlocal patches
        indent, field_name, v_string, comma = m.groups()
        # Skip if already has .maxLength
        # (won't match because regex is anchored to `v.string()` literally —
        # if .maxLength was already there, the line would not match this pattern)
        max_len = max_length_for(field_name)
        patches += 1
        return f"{indent}{field_name}: {v_string}.maxLength({max_len}){comma}"

    def repl_optional(m: re.Match) -> str:
        nonlocal patches
        indent, field_name, v_string, comma = m.groups()
        max_len = max_length_for(field_name)
        patches += 1
        return f"{indent}{field_name}: v.optional({v_string}.maxLength({max_len})){comma}"

    text = V_STRING_PATTERN.sub(repl_simple, text)
    text = V_OPTIONAL_STRING_PATTERN.sub(repl_optional, text)

    if text != original:
        path.write_text(text)
    return patches


# ─── (B) Unbounded .collect() -> .take(N) ─────────────────────────────────────
# Replace `.collect()` with `.take(N)`. Choose N by file/path context.
COLLECT_PATTERN = re.compile(r'\.collect\(\)')

# Heuristic: pick N based on file path
def take_n_for(path: Path) -> int:
    p = str(path)
    # Admin / seed / cleanup — needs to read everything
    if "adminListAll" in p or "adminSeed" in p or "cleanup" in p:
        return 10000
    # Waitlist — could be large
    if "waitlist" in p:
        return 10000
    # Auth / account lookups — should be small (1-10)
    if "auth" in p.lower() and "authAccounts" in p:
        return 10
    # Bulk import / export
    if "bulk" in p.lower():
        return 1000
    # List endpoints (default)
    return 1000


def patch_collect_calls(path: Path) -> int:
    """Replace .collect() with .take(N). Returns # of replacements."""
    text = path.read_text()
    if ".collect()" not in text:
        return 0

    # Skip files where .collect() is intentional (manually verified):
    # - security/ownerAuth.ts already uses .take(1000) per v5.4.0
    # Skip generated files
    if "_generated" in str(path):
        return 0

    n = take_n_for(path)
    new_text = COLLECT_PATTERN.sub(f".take({n})", text)
    if new_text != text:
        path.write_text(new_text)
        return text.count(".collect()")
    return 0


# ─── Main ────────────────────────────────────────────────────────────────────
def main() -> int:
    print("=" * 72)
    print("AXIA v5.5.0 — bulk security patches")
    print("=" * 72)

    # (A) Schema bounds
    print("\n[A] Schema bounds — adding .maxLength(N) to v.string() fields")
    schema_files = sorted(TABLES_DIR.glob("*.ts"))
    schema_files = [f for f in schema_files if not f.name.endswith(".disabled")]
    total_schema_patches = 0
    for f in schema_files:
        n = patch_schema_file(f)
        if n:
            print(f"  {f.name:40s} {n:4d} fields bounded")
            total_schema_patches += n
    print(f"  → Total schema patches: {total_schema_patches}")

    # (B) Unbounded .collect() -> .take(N)
    print("\n[B] Unbounded .collect() — replacing with .take(N)")
    convex_files = sorted(CONVEX_DIR.rglob("*.ts"))
    convex_files = [f for f in convex_files if "_generated" not in str(f)]
    total_collect_patches = 0
    for f in convex_files:
        n = patch_collect_calls(f)
        if n:
            rel = f.relative_to(CONVEX_DIR)
            print(f"  {str(rel):50s} {n:3d} .collect() → .take(N)")
            total_collect_patches += n
    print(f"  → Total .collect() patches: {total_collect_patches}")

    print("\n" + "=" * 72)
    print(f"DONE. {total_schema_patches} schema bounds + {total_collect_patches} .collect() bounds applied.")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
