# Citour 项目运维部署文档

本文档详细说明了 Citour (词途) 项目的部署流程，包括代码托管、数据库初始化、服务端部署以及客户端打包。

## 1. 代码提交 (GitHub)

将项目源代码提交到 GitHub 是所有部署工作的基础 (特别是对于 Cloudflare Pages 的自动化部署)。

### 1.1 初始化与提交

如果项目尚未初始化 Git 仓库：

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: Citour project structure"
```

### 1.2 推送到 GitHub

1. 在 GitHub 上创建一个新的仓库 (例如 `Citour`)。
2. 关联远程仓库并推送：

```bash
# 替换为你的 GitHub 仓库地址
git remote add origin git@github.com:all4you/Citour.git
git branch -M main
git push -u origin main
```

---

## 2. 数据库部署 (Cloudflare D1)

本项目使用 Cloudflare D1 (Serverless SQLite) 作为核心数据库。

### 2.1 准备工作

确保已安装 Wrangler CLI 并登录：

```bash
# 使用 npx 运行 (无需全局安装)
npx wrangler login

# 或者全局安装 (需要权限):
# 先安装nvm
nvm install stable
nvm alias default stable
# 然后在全局安装
npm install -g wrangler
wrangler login
```

> **常见问题**: 如果执行 `npm install -g` 遇到 `EACCES` 权限错误，推荐安装 **[nvm](https://github.com/nvm-sh/nvm)** (Node Version Manager) 来管理 Node 版本，这可以完美解决权限问题，也是管理多版本 Node 的最佳实践。

### 2.2 创建 D1 数据库

在终端执行以下命令创建数据库：

```bash
npx wrangler d1 create citour-db
```

命令执行成功后，控制台会输出 `database_id`。请将此 ID 复制，并更新到 `apps/api/wrangler.toml` 文件中：

```toml
# apps/api/wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "citour-db"
database_id = "你的_DATABASE_ID_粘贴在这里"
```

> **重要说明**: `wrangler dev` 默认使用本地 SQLite 文件。只有加上 `--remote` 参数 (如 `npm run dev:remote`) 才会连接到这里配置的远程 D1 数据库。修改 `wrangler.toml` 中的 ID 不影响默认的本地开发体验。

### 2.3 初始化表结构与数据

我们已经准备好了 `schema.sql`，其中包含表结构定义和系统默认数据 (System 租户和管理员)。

**执行初始化命令 (远程环境):**

```bash
cd apps/api
npm run db:init:remote
```

> 该命令对应 `wrangler d1 execute citour-db --remote --file=./schema.sql`，会自动创建 `tenants`, `users`, `word_books`, `words` 等所有表，并插入初始管理员账号。

### 2.4 验证数据

你可以通过 Wrangler 直接查询生产环境数据库来验证：

```bash
wrangler d1 execute citour-db --remote --command="SELECT * FROM users"
```

---

## 3. 服务端部署

### 3.1 部署 API (Cloudflare Workers)

后端 API 是基于 Cloudflare Workers 构建的。

**部署步骤:**

1. 进入 API 目录：
   ```bash
   cd apps/api
   ```

2. 运行部署命令：
   ```bash
   npm run deploy
   ```

3. 部署成功后，控制台会输出 API 的访问地址，例如 `https://your-api.workers.dev`。

**关于自定义域名:**
Cloudflare Workers 也支持自定义域名。
1. 在 Cloudflare Dashboard 中进入该 Worker 的 **Triggers** 选项卡。
2. 点击 **Add Custom Domain**，输入你的子域名 (如 `api.citour.com`)。
3. 绑定后，你的 API 地址即变为 `https://api.citour.com`。

**更新客户端配置:**

部署完成后，请记录下您的 API 地址 (例如 `https://your-api.workers.dev`)。

您将在 **第 4 节：学生端桌面应用打包** 中使用此地址来配置客户端。

### 3.2 部署 Admin 管理后台 (Cloudflare Pages)

推荐使用 Cloudflare Pages 进行自动化部署。

**方式 A: 连接 Git 自动部署 (推荐)**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages**。
2. 点击 **Create Application** -> **Pages** -> **Connect to Git**。
3. 选择刚才推送的 GitHub 仓库 `Citour`。
4. **Build settings (构建配置)**:
   - **Framework preset**: `无`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory** (重要): `apps/admin`
5. **Environment variables (环境变量)**:
   - 添加 `VITE_API_URL`，值为你的 API Worker 地址 (例如 `https://your-api.workers.dev`).
6. 点击 **Save and Deploy**。

**方式 B: 本地构建后上传**

如果不使用 Git 集成，也可以手动构建上传：

1. 本地构建：
   ```bash
   cd apps/admin
   # 确保 .env 中配置了正确的 VITE_API_URL
   npm run build
   ```
2. 将 `apps/admin/dist` 目录下的所有文件上传到 Cloudflare Pages 或其他静态托管服务 (如 Vercel, Netlify)。

**关于自定义域名:**
Cloudflare Pages 允许你绑定自定义域名。在 Pages 项目的 **Custom domains** 设置中添加你的域名 (如 `admin.citour.com`)，Cloudflare 会自动配置 DNS 和 SSL。



---

## 4. 学生端桌面应用打包 (Mac & Windows)

学生端基于 Tauri 构建。由于 Tauri 依赖系统底层的构建工具，**构建特定平台的安装包通常需要在对应的操作系统上进行** (即：在 Mac 上打 Mac 包，在 Windows 上打 Windows 包)。

### 4.1 环境准备与配置

由于打包后的桌面应用是独立运行的，不能像开发环境那样使用代理转发请求。因此，我们需要明确指定 API 的完整地址。

1. **代码调整 (已自动完成):**
   确保 `apps/desktop/src/services/api.js` 使用了环境变量：
   ```javascript
   const baseURL = import.meta.env.VITE_API_URL || '';
   ```

2. **生成应用图标:**
   ```bash
   cd apps/desktop
   # 确保有一张 1024x1024 的 app-icon.png
   # path/to/app-icon.png 为图标文件路径，支持相对路径和绝对路径，相对路径是相对于apps/desktop目录
   npm run tauri icon path/to/app-icon.png
   ```

### 4.2 多环境打包配置

项目支持多种打包方式，适应不同场景：

| 打包命令 | 用途 | API 地址来源 |
|---------|------|-------------|
| `npm run tauri:build:local` | 本地调试包 | 命令行 `cross-env` 注入 `localhost:8787` |
| `npm run tauri:build:prod` | 生产包 | 环境变量 `VITE_API_URL` |
| `npm run tauri:build` | 默认 | 优先环境变量，否则回退到空字符串 |

**本地打包连接本地 API (调试用):**
```bash
cd apps/desktop
npm install
npm run tauri:build:local
```

**本地打包连接生产 API:**
```bash
cd apps/desktop
npm install
# 注意：通过参数指定生产环境的API域名，然后打包，例如：
VITE_API_URL=https://your-api.workers.dev npm run tauri:build
```


### 4.3 打包 macOS 版本 (需要在 Mac 上执行)

**环境要求:**
- Xcode Command Line Tools (`xcode-select --install`)

**构建命令:**

```bash
cd apps/desktop
npm install
VITE_API_URL=https://your-api.workers.dev npm run tauri:build
```

**输出产物:**
构建完成后，安装包位于：
`apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg` (主要分发格式)
`apps/desktop/src-tauri/target/release/bundle/macos/*` (应用程序)

### 4.4 打包 Windows 版本 (需要在 Windows 上执行)

**环境要求:**
- Microsoft Visual Studio C++ Build Tools

**构建命令:**
如果你有 Windows 电脑，拉取代码后执行：

```bash
cd apps/desktop
npm install
VITE_API_URL=https://your-api.workers.dev npm run tauri:build
```

**输出产物:**
构建完成后，安装包位于：
`apps/desktop/src-tauri/target/release/bundle/msi/*.msi` (安装程序)
`apps/desktop/src-tauri/target/release/bundle/nsis/*.exe` (如果配置了 NSIS)

### 4.5 使用 GitHub Actions 自动构建 (推荐)

为了避免需要两台电脑，我们可以使用 GitHub Actions 自动构建多平台版本。此配置会在你推送 `v*` 格式的标签时自动触发。

**1. 配置 GitHub Secrets:**
在 GitHub 仓库 -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:
- `VITE_API_URL`: 填入生产环境 API 域名 (例如 `https://your-api.workers.dev`) -- **注意不带 /api**

**2. 创建 Workflow 文件:**
在项目根目录创建 `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.create_release.outputs.id }}
      upload_url: ${{ steps.create_release.outputs.upload_url }}
    steps:
      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Automatic release for ${{ github.ref }}
            
            See the assets below for macOS (.dmg) and Windows (.msi) installers.
          draft: true
          prerelease: false

  build-tauri:
    needs: create-release
    strategy:
      fail-fast: false
      matrix:
        platform: [macos-latest, windows-latest]
    
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - name: setup node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
      
      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      
      - name: install frontend dependencies
        run: |
          cd apps/desktop
          npm install

      - name: Build the app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # 注入生产环境 API 地址
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          projectPath: "./apps/desktop"
          args: ${{ matrix.platform == 'macos-latest' && '--target universal-apple-darwin' || '' }}
```

**3. 触发构建 (使用脚本):**

项目根目录已提供 `release.sh` 脚本，可一步完成版本更新、提交和打标签。

```bash
# 确保脚本有执行权限
chmod +x release.sh

# 运行发布脚本 (参数：版本号 [发布说明])
./release.sh 1.0.1 "fix: 修复了 API 配置和样式问题"
```

脚本执行完成后，按提示运行推送命令即可：

```bash
git push && git push origin v1.0.1
```

**4. 查看构建进度:**
去 GitHub 仓库的 **Actions** 页面查看运行状态。构建完成后，在 **Releases** 页面会看到一个新的 Draft Release，包含构建好的 `.dmg` (Mac) 和 `.msi` (Windows) 安装包。点击 "Edit" 发布即可。
