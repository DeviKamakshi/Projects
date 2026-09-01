#!/usr/bin/env python3
"""
HydroShield AI - Clean Static Web Server
Serves all application files for HydroShield AI.
"""

import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class HydroShieldHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), HydroShieldHandler) as httpd:
        print(f"HydroShield AI Web Server running on port {PORT}...")
        httpd.serve_forever()
