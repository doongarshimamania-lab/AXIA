import http.server
import socketserver
import socket
import os

os.chdir('/home/z/my-project/timelock/dist')

class DualStackServer(socketserver.TCPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True
    
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

handler = http.server.SimpleHTTPRequestHandler

print('Starting preview server on [::]:3000 (dual-stack IPv4+IPv6)...')
with DualStackServer(('::', 3000), handler) as httpd:
    httpd.serve_forever()
