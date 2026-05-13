#!/bin/bash
set -e

# Token 从环境变量读取，不写在代码里
# 使用前请先执行：export CF_TOKEN=<your_cloudflare_token>
# 或由 CI/CD 环境注入
CF_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CF_ACCOUNT="6c02b24f254aa18c6e0aadc3920e2535"
CF_PROJECT="game-promo-platform"

if [ -z "$CF_TOKEN" ]; then
  echo "❌ 请先设置环境变量 CLOUDFLARE_API_TOKEN"
  exit 1
fi

echo "🧹 清除 wrangler 本地缓存..."
rm -rf .wrangler/

echo "🚀 部署中..."
CLOUDFLARE_API_TOKEN=$CF_TOKEN npx wrangler pages deploy . \
  --project-name=$CF_PROJECT \
  --branch=main \
  --commit-dirty=true

echo "📌 更新正式域名指向..."
DEPLOY_ID=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/pages/projects/$CF_PROJECT/deployments?per_page=1" \
  -H "Authorization: Bearer $CF_TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin)['result'][0]['id'])")

curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/pages/projects/$CF_PROJECT" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"canonical_deployment\": {\"id\": \"$DEPLOY_ID\"}}" | python3 -c "import json,sys; r=json.load(sys.stdin); print('✅ 正式域名已更新' if r.get('success') else '❌ 更新失败: '+str(r))"

echo "✅ 部署完成：https://game-promo-platform.pages.dev"
