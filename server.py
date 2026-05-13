#!/usr/bin/env python3
"""
轻量级 REST API + 静态文件服务器
端口: 8899
API:
  GET  /api/db      → 返回完整 DB JSON
  POST /api/db      → 覆盖保存并返回新 DB
  GET  /api/version → 返回 { version: N }
静态文件: 其余路径从脚本同目录服务
"""

import http.server
import json
import os
import threading
import urllib.parse
from pathlib import Path

PORT = 8899
BASE_DIR = Path(__file__).parent.resolve()
DATA_FILE = BASE_DIR / 'data.json'

EMPTY_DB = {
    'tasks': [],
    'signups': [],
    'contents': [],
    'cdkPools': {},
    'pendingActions': [],
    '_version': 0,
}

# 全局锁，保护并发写
_lock = threading.Lock()


def read_db():
    """读取 data.json，如不存在则初始化。"""
    with _lock:
        if not DATA_FILE.exists():
            db = dict(EMPTY_DB)
            DATA_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding='utf-8')
            return db
        try:
            db = json.loads(DATA_FILE.read_text(encoding='utf-8'))
            # 保证结构完整
            for k, v in EMPTY_DB.items():
                if k not in db:
                    db[k] = type(v)() if isinstance(v, (list, dict)) else v
            return db
        except Exception:
            db = dict(EMPTY_DB)
            DATA_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding='utf-8')
            return db


def write_db(db):
    """写入 data.json，版本号 +1。"""
    with _lock:
        db['_version'] = db.get('_version', 0) + 1
        DATA_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding='utf-8')
        return db


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    # ---------- CORS helpers ----------
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    # ---------- JSON response ----------
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    # ---------- routing ----------
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/api/db':
            db = read_db()
            public = {k: v for k, v in db.items() if k != '_version'}
            self._json(200, public)
        elif path == '/api/version':
            db = read_db()
            self._json(200, {'version': db.get('_version', 0)})
        else:
            # 静态文件
            super().do_GET()

    def end_headers(self):
        # 所有静态文件禁缓存
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/api/db':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                new_db = json.loads(body.decode('utf-8'))
            except Exception as e:
                self._json(400, {'error': f'Invalid JSON: {e}'})
                return
            # 保留 _version 并写入
            saved = write_db(new_db)
            public = {k: v for k, v in saved.items() if k != '_version'}
            self._json(200, public)
        else:
            self._json(404, {'error': 'Not found'})

    def log_message(self, fmt, *args):
        # 简洁日志
        print(f'[{self.address_string()}] {fmt % args}')


if __name__ == '__main__':
    # 确保 data.json 存在
    read_db()
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'✅ Server running at http://localhost:{PORT}')
    print(f'   Static files: {BASE_DIR}')
    print(f'   Data file:    {DATA_FILE}')
    print(f'   API:          http://localhost:{PORT}/api/db')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n🛑 Server stopped.')
