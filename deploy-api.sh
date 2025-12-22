#!/bin/bash

# Citour - Cloudflare Workers 部署脚本
# 用法: ./scripts/deploy-api.sh

set -e

echo "🚀 开始部署 Cloudflare Workers API..."
echo ""

# 进入 api 目录
cd "$(dirname "$0")/apps/api"

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 执行部署
echo "☁️  部署到 Cloudflare Workers..."
npm run deploy

echo ""
echo "✅ 部署完成!"
