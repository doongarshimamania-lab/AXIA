#!/usr/bin/env python3
"""
Axia preview server with SPA fallback — daemon version.
Serves /home/z/my-project/dist on port 3000 with SPA fallback to index.html.
"""
import os, sys, http.server, socketserver
from pathlib import Path

# Double-fork to fully detach (survives shell exit)
if os.fork() > 0: sys.exit(0)
os.setsid()
if os.fork() > 0: sys.exit(0)

sys.stdout = open('/tmp/axia_preview.log', 'a')
sys.stderr = open('/tmp/axia_preview.log', 'a')

# Try /home/z/my-project/dist first (gateway expected location);
# fall back to /home/z/my-project/axia/dist
ROOT_CANDIDATES = [
    Path("/home/z/my-project/dist"),
    Path("/home/z/my-project/axia/dist"),
]
ROOT = next((p for p in ROOT_CANDIDATES if p.is_dir()), ROOT_CANDIDATES[-1]).resolve()

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        return self._handle()

    def do_HEAD(self):
        return self._handle(head=True)

    def _handle(self, head=False):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        candidate = (ROOT / path.lstrip("/")).resolve()
        try:
            candidate.relative_to(ROOT)
            if candidate.is_file():
                return super().do_GET() if not head else super().do_HEAD()
        except ValueError:
            pass

        # SPA fallback — serve index.html with 200
        index_path = ROOT / "index.html"
        if not index_path.is_file():
            self.send_error(404, "index.html not found")
            return
        body = index_path.read_bytes() if not head else b""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body) if not head else (index_path.stat().st_size)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

class S(socketserver.TCPServer):
    allow_reuse_address = True

print(f"[axia-preview] serving {ROOT} on :3000", flush=True)
with S(("0.0.0.0", 3000), SPAHandler) as httpd:
    httpd.serve_forever()
