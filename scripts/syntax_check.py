#!/usr/bin/env python3
"""syntax_check.py — verify modified .ts files have balanced braces and look syntactically valid."""
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/axia/src/convex")

def check_file(path: Path) -> list[str]:
    """Return list of issues found."""
    issues = []
    text = path.read_text()

    # Check brace balance
    open_braces = text.count("{")
    close_braces = text.count("}")
    if open_braces != close_braces:
        issues.append(f"brace imbalance: {open_braces} open vs {close_braces} close")

    # Check parens balance
    open_parens = text.count("(")
    close_parens = text.count(")")
    if open_parens != close_parens:
        issues.append(f"paren imbalance: {open_parens} open vs {close_parens} close")

    # Check that rateLimitAuthenticated calls have proper syntax
    # Pattern: await rateLimitAuthenticated(ctx, "name");
    bad_rl = re.findall(r'rateLimitAuthenticated\([^;]*$', text, re.MULTILINE)
    if bad_rl:
        issues.append(f"{len(bad_rl)} rateLimitAuthenticated call(s) missing semicolon")

    # Check that imports look right
    if "rateLimitAuthenticated" in text and "security/rateLimit" not in text:
        issues.append("uses rateLimitAuthenticated but no security/rateLimit import")

    return issues


def main():
    print("=" * 60)
    print("Syntax check on src/convex/**/*.ts")
    print("=" * 60)
    total_files = 0
    total_issues = 0
    for f in sorted(ROOT.rglob("*.ts")):
        if "_generated" in str(f):
            continue
        total_files += 1
        issues = check_file(f)
        if issues:
            total_issues += len(issues)
            rel = f.relative_to(ROOT)
            print(f"  ❌ {rel}")
            for issue in issues:
                print(f"      • {issue}")
    print(f"\nFiles checked: {total_files}")
    print(f"Issues found:  {total_issues}")
    if total_issues == 0:
        print("✓ All files pass basic syntax checks.")
    return 0 if total_issues == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
