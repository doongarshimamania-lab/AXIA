#!/usr/bin/env python3
"""
Create a GitHub Release for the AXIA repo and attach the complete-code backup ZIP.

Reads the GitHub PAT from the git remote URL (so it's never printed).
Uses GitHub REST API:
  1. POST /repos/{owner}/{repo}/releases  -> create release
  2. POST upload URL with asset            -> upload ZIP

Run from /home/z/my-project/
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path("/home/z/my-project").resolve()
REPO = "doongarshimamania-lab/AXIA"
TAG = "v5.3.0-folder-reorg"
RELEASE_NAME = "v5.3.0 — Two-folder reorganization (axia/ + resources/)"
RELEASE_BODY = """\
## What's in this release

This release reorganizes the repository into exactly **two top-level folders**:

- `axia/` — production-ready, runnable project (frontend + Convex backend). All new commits go here.
- `resources/` — everything else (backups, snapshots, research, screenshots, dev scripts, docs).

### How to run AXIA locally

```bash
unzip AXIA-COMPLETE-BACKUP-*.zip
cd axia/
cp .env.example .env       # fill in your Convex URL + deploy key
bun install                # or: npm install / pnpm install
bun run dev                # vite dev server on :3000
```

### What changed in this release

- Reorganized 100+ top-level files and 20+ directories into two clean folders
- No source code modified, no files deleted — all moves via `git mv` (history preserved)
- Path updates to 3 dev/preview server scripts (necessary, no behavior changes):
  - `resources/.zscripts/dev.sh`
  - `resources/scripts/server-manager.cjs`
- Updated root `.gitignore` for new structure
- New top-level `README.md` explaining the layout
- New `axia/.env.example` (copied from `timelock/.env.example`)

### Verification

- `bun install` in `axia/` succeeded (538 packages)
- `bunx vite build` in `axia/` succeeded (3381 modules, 11.26s)
- Preview server restarted, serving from `axia/dist/`, HTTP 200 confirmed
- Pushed to `origin/main` at commit `38e649f`
"""

def get_token() -> str:
    """Extract the GitHub PAT from the git remote URL (never print it)."""
    r = subprocess.run(
        ["git", "config", "--get", "remote.origin.url"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    url = r.stdout.strip()
    m = re.match(r"https://([^@]+)@", url)
    if not m:
        print("ERROR: could not extract token from remote URL", file=sys.stderr)
        sys.exit(1)
    return m.group(1)


def gh(method: str, path: str, token: str, *, body: bytes | None = None,
        content_type: str = "application/json", host: str = "api.github.com"):
    """Make an authenticated GitHub API request."""
    url = f"https://{host}/{path}" if not path.startswith("http") else path
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "axia-release-script",
    }
    if body is not None:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main():
    zip_path = sorted(Path(ROOT / "resources" / "download").glob("AXIA-COMPLETE-BACKUP-*.zip"))[-1]
    print(f"=== Using backup ZIP: {zip_path.name} ({zip_path.stat().st_size // (1024*1024)} MB) ===")

    token = get_token()
    print("=== Token extracted from git remote (not printed) ===")

    # 1. Create the release (or update if it already exists)
    print(f"\n=== Creating release {TAG} ===")
    body = json.dumps({
        "tag_name": TAG,
        "target_commitish": "main",
        "name": RELEASE_NAME,
        "body": RELEASE_BODY,
        "draft": False,
        "prerelease": False,
    }).encode()
    status, resp = gh("POST", f"repos/{REPO}/releases", token, body=body)
    if status == 422:  # already exists
        print(f"  Release {TAG} already exists, fetching existing release...")
        status, resp = gh("GET", f"repos/{REPO}/releases/tags/{TAG}", token)
    if status not in (200, 201):
        print(f"  FAIL: status={status}")
        print(f"  resp: {resp[:500]}")
        sys.exit(1)
    release = json.loads(resp)
    release_id = release["id"]
    upload_url = release["upload_url"].replace("{?name,label}", "")
    print(f"  Release created: id={release_id}, html_url={release['html_url']}")

    # 2. Upload the ZIP asset
    print(f"\n=== Uploading {zip_path.name} ({zip_path.stat().st_size // (1024*1024)} MB) ===")
    with open(zip_path, "rb") as f:
        zip_bytes = f.read()
    status, resp = gh(
        "POST",
        upload_url + f"?name={zip_path.name}",
        token,
        body=zip_bytes,
        content_type="application/zip",
        host="uploads.github.com",
    )
    if status not in (200, 201):
        print(f"  FAIL: status={status}")
        print(f"  resp: {resp[:500]}")
        sys.exit(1)
    asset = json.loads(resp)
    print(f"  Asset uploaded: id={asset['id']}, url={asset['browser_download_url']}")

    print(f"\n=== Done! ===")
    print(f"Release URL: {release['html_url']}")
    print(f"Asset URL:  {asset['browser_download_url']}")


if __name__ == "__main__":
    main()
