#!/bin/bash
# 文档站点部署脚本
# 用法: ./deploy.sh [服务器地址] [部署路径]
# 示例: ./deploy.sh user@your-server.com /var/www/docs

set -e

SERVER=${1:-"user@your-server.com"}
DEPLOY_PATH=${2:-"/var/www/docs"}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 构建文档 ==="
cd "$SCRIPT_DIR"
npm run build

echo "=== 部署到 $SERVER:$DEPLOY_PATH ==="
rsync -avz --delete .vitepress/dist/ "$SERVER:$DEPLOY_PATH/"

echo "=== 部署完成 ==="
echo "访问: http://your-domain.com"
echo ""
echo "nginx 配置示例（添加到 server {} 块）:"
echo "  location /docs {"
echo "    alias $DEPLOY_PATH;"
echo "    try_files \$uri \$uri/ /docs/index.html;"
echo "  }"
