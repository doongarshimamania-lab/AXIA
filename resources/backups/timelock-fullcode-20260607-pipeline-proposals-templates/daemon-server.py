import os, sys, http.server, socketserver, socket

DIST = '/home/z/my-project/timelock/dist'
PORT = 3000

class DualStackServer(socketserver.TCPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

os.chdir(DIST)

# Double-fork to daemonize
if os.fork() > 0: sys.exit(0)
os.setsid()
if os.fork() > 0: sys.exit(0)

# Redirect stdio
sys.stdout.flush()
sys.stderr.flush()
devnull = open(os.devnull, 'r')
os.dup2(devnull.fileno(), 0)
log = open('/tmp/daemon-server.log', 'a')
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)

handler = http.server.SimpleHTTPRequestHandler
with DualStackServer(('::', PORT), handler) as httpd:
    httpd.serve_forever()
