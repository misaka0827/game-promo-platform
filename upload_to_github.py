#!/usr/bin/env python3
"""
通过 GitHub API 上传文件到仓库
"""
import base64, json, os, urllib.request, urllib.error

TOKEN = os.environ.get("GITHUB_TOKEN", "")  # 从环境变量读取
REPO  = "misaka0827/game-promo-platform"
BASE  = os.path.dirname(os.path.abspath(__file__))

FILES = [
    "admin.html",
    "blogger.html",
    "creator.html",
    "streamer.html",
    "index.html",
    "maker.html",
    "operator.html",
    "api.js",
    "functions/api/db.js",
    "style-preview.html",
    "wireframe/index.html",
]

def api(method, path, data=None):
    url = f"https://api.github.com{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github.v3+json")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def upload_file(rel_path):
    filepath = os.path.join(BASE, rel_path)
    if not os.path.exists(filepath):
        print(f"  ⚠️  跳过（不存在）: {rel_path}")
        return

    with open(filepath, "rb") as f:
        content_b64 = base64.b64encode(f.read()).decode()

    # 先获取现有文件的 SHA（更新需要）
    existing, status = api("GET", f"/repos/{REPO}/contents/{rel_path}")
    sha = existing.get("sha") if status == 200 else None

    payload = {
        "message": f"deploy: {rel_path}",
        "content": content_b64,
        "branch": "main",
    }
    if sha:
        payload["sha"] = sha

    result, code = api("PUT", f"/repos/{REPO}/contents/{rel_path}", payload)
    if code in (200, 201):
        print(f"  ✅ {rel_path}")
    else:
        print(f"  ❌ {rel_path} → {code}: {result.get('message','?')}")

if __name__ == "__main__":
    print(f"📤 上传到 {REPO} ...")
    for f in FILES:
        upload_file(f)
    print("\n🎉 上传完成！")
