#!/bin/bash

# 检查是否提供了版本号
if [ -z "$1" ]; then
    echo "错误: 请提供版本号，例如: ./release.sh 1.0.1 \"发布说明内容\""
    exit 1
fi

VERSION=$1
MSG=${2:-"chore(release): bump version to $VERSION"}

echo "🚀 开始发布新版本: $VERSION"

# 1. 更新 apps/desktop/package.json 中的版本号
echo "📦 更新 apps/desktop/package.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" apps/desktop/package.json

# 2. 更新 apps/desktop/src-tauri/tauri.conf.json 中的版本号
echo "📦 更新 apps/desktop/src-tauri/tauri.conf.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" apps/desktop/src-tauri/tauri.conf.json

# 3. 提交更改
echo "💾 提交版本文件更改..."
git add apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json
git commit -m "chore(release): bump version to $VERSION"

# 4. 打 Tag
echo "🏷️  创建 Git Tag: v$VERSION"
git tag -a "v$VERSION" -m "$MSG"

# 5. 提示推送到远程
echo ""
echo "✅ 版本更新完成！"
echo "请运行以下命令推送到远程并触发自动构建："
echo ""
echo "git push && git push origin v$VERSION"
echo ""
