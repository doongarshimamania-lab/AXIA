#!/usr/bin/env python3
"""Tiny static file server for /home/z/my-project/download/.
Listens on FC_CUSTOM_LISTEN_PORT (81) so the IM gateway preview URL routes here.
"""
import os, sys, http.server, socketserver
from pathlib import Path

ROOT = Path("/home/z/my-project/download")
PORT = 3000  # Caddy on :81 proxies preview-<bot-id> here

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)
    def log_message(self, *a):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), a[0]))

    def end_headers(self):
        # Allow CORS + let browser download instead of inline-rendering
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Disposition", 'attachment; filename="%s"' % os.path.basename(self.path))
        super().end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReusableTCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving {ROOT} on http://0.0.0.0:{PORT}", flush=True)
    httpd.serve_forever()
