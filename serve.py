# -*- coding: utf-8 -*-
"""戏精讨饭大王 · 本地代理服务器
同时做三件事:
  1. 提供当前目录的静态文件(index.html / env.js 等)
  2. 把 /v1/* 请求转发到 Agnes API,绕开浏览器的 CORS 跨域拦截
  3. 把 /img-proxy?url=xxx 图片请求转发到 Agnes CDN,解决 html2canvas 截图外链污染

用法:
  python serve.py            # 默认 8000 端口
  python serve.py 9000       # 指定端口

然后浏览器打开 http://localhost:8000/ 即可。
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import urllib.parse
import json
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
AGNES_BASE = "https://apihub.agnes-ai.com/v1"
PROXY_TIMEOUT = 120  # 图像生成较慢,给足 120 秒


class Handler(http.server.SimpleHTTPRequestHandler):
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
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        # /img-proxy?url=<encoded_url>  ->  代理图片,避免 html2canvas 外链污染
        if self.path.startswith("/img-proxy"):
            self._img_proxy()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/v1/"):
            self._proxy()
        else:
            self.send_error(404, "Not Found")

    def _proxy(self):
        url = AGNES_BASE + self.path[len("/v1"):]
        length = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(length) if length else b""

        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        auth = self.headers.get("Authorization")
        if auth:
            req.add_header("Authorization", auth)

        try:
            with urllib.request.urlopen(req, timeout=PROXY_TIMEOUT) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for key, val in resp.getheaders():
                    if key.lower() in ("transfer-encoding", "content-encoding",
                                       "content-length", "connection",
                                       "strict-transport-security", "set-cookie"):
                        continue
                    self.send_header(key, val)
                self._cors()
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
                print(f"[Agnes /v1] {resp.status} OK  ({len(resp_body)} bytes)")
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
            print(f"[Agnes /v1] {e.code} ERROR: {err_body[:600].decode('utf-8', 'ignore')}")
        except Exception as e:
            msg = json.dumps({"error": {"message": str(e)}}).encode()
            self.send_response(502)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            print(f"[Proxy /v1 Error] {e}")

    def _img_proxy(self):
        """代理 Agnes CDN 图片:GET /img-proxy?url=https://..."""
        try:
            qs = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(qs)
            target = params.get("url", [None])[0]
            if not target:
                self.send_error(400, "Missing url param")
                return
            # 只允许 Agnes 官方域名,防止被滥用为公开代理
            host = urllib.parse.urlparse(target).hostname or ""
            if not (host.endswith("agnes-ai.space") or host.endswith("agnes-ai.com")):
                self.send_error(403, "Host not allowed")
                return

            req = urllib.request.Request(target, method="GET")
            req.add_header("User-Agent", "BeggingBot/1.0 (+local proxy)")
            with urllib.request.urlopen(req, timeout=PROXY_TIMEOUT) as resp:
                data = resp.read()
                ctype = resp.headers.get("Content-Type", "image/png")
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self._cors()
                self.end_headers()
                self.wfile.write(data)
                print(f"[img-proxy] {resp.status} OK  ({len(data)} bytes)  {host}")
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self._cors()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"IMG HTTP {e.code}".encode())
            print(f"[img-proxy] {e.code} ERR for {target}")
        except Exception as e:
            self.send_response(502)
            self._cors()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"IMG ERR: {e}".encode("utf-8", "ignore"))
            print(f"[img-proxy] EXC: {e}")

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 56)
        print(" 戏精讨饭大王 · 本地代理服务器 (v2)")
        print("=" * 56)
        print(f" 网页地址   : http://localhost:{PORT}/")
        print(f" API 代理   : /v1/*           ->  {AGNES_BASE}/*")
        print(f" 图片代理   : /img-proxy?url= ->  Agnes CDN")
        print(f" 接口超时   : {PROXY_TIMEOUT}s")
        print(" 按 Ctrl+C 停止")
        print("=" * 56)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止,拜拜~")
