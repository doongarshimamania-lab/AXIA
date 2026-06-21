#!/bin/bash
while true; do
  cd /home/z/my-project/timelock/public
  python3 -c "
import http.server, socketserver, os, signal
os.chdir('/home/z/my-project/timelock/public')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
with socketserver.TCPServer(('0.0.0.0', 3000), H) as httpd:
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    httpd.serve_forever()
" 2>/dev/null
  sleep 2
done
