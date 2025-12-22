#!/bin/bash

# Citour - 学生端应用打包脚本
# 用法: 
#   ./build-app.sh --env local                      # 本地测试包（连接本地 API）
#   ./build-app.sh --env prod --api-url <url>       # 生产环境打包（连接远程 API）

set -e

# 默认值
ENV=""
API_URL=""

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            if [[ "$ENV" != "local" && "$ENV" != "prod" ]]; then
                echo "❌ 错误: --env 参数只能是 'local' 或 'prod'"
                exit 1
            fi
            shift 2
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        -h|--help)
            echo "用法: ./build-app.sh --env <local|prod> [选项]"
            echo ""
            echo "必需参数:"
            echo "  --env <local|prod>    指定环境 (local=本地测试, prod=生产环境)"
            echo ""
            echo "可选参数:"
            echo "  --api-url <url>       指定 API 地址 (例如: https://api.example.com)"
            echo "  -h, --help            显示帮助信息"
            echo ""
            echo "示例:"
            echo "  ./build-app.sh --env local                                # 本地测试包"
            echo "  ./build-app.sh --env prod --api-url https://api.example.com  # 生产环境打包"
            exit 0
            ;;
        *)
            echo "❌ 未知参数: $1"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

# 检查必需参数
if [ -z "$ENV" ]; then
    echo "❌ 错误: 必须指定 --env 参数"
    echo ""
    echo "用法: ./build-app.sh --env <local|prod> [--api-url <url>]"
    echo "使用 --help 查看帮助"
    exit 1
fi

echo "🚀 开始打包学生端应用..."
echo "📦 环境: $ENV"

# 进入 desktop 目录
cd "$(dirname "$0")/apps/desktop"

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 清理旧的打包文件
BUNDLE_DIR="src-tauri/target/release/bundle"
if [ -d "$BUNDLE_DIR" ]; then
    echo "🧹 清理旧的打包文件..."
    rm -rf "$BUNDLE_DIR"
fi

echo ""

# 执行打包
echo "🔨 开始构建..."
if [ "$ENV" = "local" ]; then
    # 本地测试包：设置标识，使用 tauri:build:local
    echo "🏷️  构建类型: 本地测试包"
    echo "🌐 API 地址: 本地开发环境"
    VITE_BUILD_TYPE=local npm run tauri:build:local
else
    # 生产环境：检查 API_URL
    if [ -z "$API_URL" ]; then
        echo "❌ 错误: 生产环境必须指定 --api-url 参数"
        exit 1
    fi
    echo "️🏷️  构建类型: 本地测试包"
    echo "🌐 API 地址: $API_URL"
    VITE_BUILD_TYPE=local VITE_API_URL="$API_URL" npm run tauri:build
fi

echo ""
echo "✅ 打包完成!"
echo "📁 查看上方日志中的输出目录"
