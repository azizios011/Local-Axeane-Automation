"""Mock backend service for testing service-mode detection."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, threading, time

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok", "mode": "mock-service"}).encode())
    def log_message(self, *a):
        pass

s = HTTPServer(("127.0.0.1", 8080), Handler)
t = threading.Thread(target=s.serve_forever, daemon=True)
t.start()
print("MOCK SERVICE UP ON 8080")
time.sleep(120)