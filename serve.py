# -*- coding: utf-8 -*-
"""戏精讨饭大王 · 本地代理服务器
同时做两件事:
  1. 提供当前目录的静态文件(index.html / env.js / reward-qr.png 等)
  2. 把 /v1/* 请求转发到 Agnes API,绕开浏览器的 CORS 跨域拦截

用法:
  python serve.py            # 默认 8000 端口
  python serve.py 9000       # 指定端口

然后浏览器打开 http://localhost:8000/ 即可。
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import json
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
AGNES_BASE = "https://apihub.agnes-ai.com/v1"


class Handler(http.server.SimpleHTTPRequestHandler):
    # 静态文件默认编码处理中文
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".html": "text/html; charset=utf-8",
    }

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def end_headers(self):
        # 禁止缓存,确保每次都拿到最新文件(避免改了 env.js/index.html 不生效)
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        # CORS 预检请求直接放行
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path.startswith("/v1/"):
            self._proxy()
        else:
            self.send_error(404, "Not Found")

    def _proxy(self):
        # /v1/chat/completions -> https://apihub.agnes-ai.com/v1/chat/completions
        url = AGNES_BASE + self.path[len("/v1"):]
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length else b""

        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        auth = self.headers.get("Authorization")
        if auth:
            req.add_header("Authorization", auth)

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for key, val in resp.getheaders():
                    if key.lower() in ("transfer-encoding", "content-encoding",
                                       "content-length", "connection"):
                        continue
                    self.send_header(key, val)
                self._cors()
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
                print(f"[Agnes] {resp.status} OK  ({len(resp_body)} bytes)")
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
            print(f"[Agnes] {e.code} ERROR: {err_body[:500].decode('utf-8', 'ignore')}")
        except Exception as e:
            msg = json.dumps({"error": {"message": str(e)}}).encode()
            self.send_response(502)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            print(f"[Proxy Error] {e}")

    def log_message(self, fmt, *args):
        # 简化日志
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    # 允许端口复用,避免重启时端口占用
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 50)
        print(" 戏精讨饭大王 · 本地代理服务器")
        print("=" * 50)
        print(f" 网页地址: http://localhost:{PORT}/")
        print(f" API 代理: /v1/*  ->  {AGNES_BASE}/*")
        print(" 按 Ctrl+C 停止")
        print("=" * 50)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止,拜拜~")
