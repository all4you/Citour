# 项目介绍
词途是一个英语单词打卡应用，包含管理后台和学生练习平台。
系统使用 Cloudflare D1 (SQLite) 作为底层数据库，支持移动端和桌面端使用。

# 目录结构
本项目采用 Monorepo 结构：
- apps/api: 后端 API (Cloudflare Workers + Hono)。负责所有业务逻辑和数据读写。
- apps/admin: 管理后台 (React + Ant Design Pro)。包含系统管理和租户管理功能。
- apps/desktop: 学生端应用 (Tauri + React)。同时支持 Web 端和桌面端。

# 系统架构

```
apps/desktop (Tauri + React)       ─┐
                                   ─┼→ Cloudflare Workers (Hono) → D1 数据库
apps/admin   (React Web)           ─┘
```

## 技术栈
| 组件 | 技术 |
|------|------|
| 后端运行时 | Cloudflare Workers |
| 后端框架 | Hono |
| 数据库 | Cloudflare D1 (SQLite) |
| 学生端 (Web + 桌面) | Tauri + React |
| 管理端 | React + Ant Design Pro |

## 角色分类

### 系统管理员 (sys_admin)
- **职责**: 管理所有租户，创建和配置租户信息
- **访问路径**: `/sys/*`
- **功能**: 查看/创建租户，管理租户信息
- **登录地址**: `/sys/login`

### 租户管理员 (admin)
- **职责**: 管理本租户的单词本、学生和练习记录
- **访问路径**: `/tenant/*`
- **功能**: 管理单词本/单词，管理学生账号，查看练习记录
- **登录地址**: `/tenant/login`

### 学生 (student)
- **职责**: 使用练习 App 进行单词学习
- **功能**: 选择单词本学习，完成打卡练习，查看错词本

---

# 数据库表结构设计

## 系统表

### tenants 表
租户信息表

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| name | TEXT | 租户名称 |
| status | TEXT | 状态: active/inactive |
| created_at | DATETIME | 创建时间 |

### users 表
用户表（管理员 + 学生）

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| tenant_id | INTEGER | 所属租户ID |
| name | TEXT | 用户姓名 |
| account | TEXT | 账号名称，租户内唯一 |
| password | TEXT | 登录密码 |
| role | TEXT | 角色: sys_admin/admin/student |
| class_name | TEXT | 学生班级（可选） |
| created_at | DATETIME | 创建时间 |

---

## 业务表

### word_books 表
单词本

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| tenant_id | INTEGER | 所属租户ID |
| name | TEXT | 单词本名称 |
| description | TEXT | 单词本介绍 |
| status | TEXT | 状态: online/offline |
| word_count | INTEGER | 单词数量（缓存） |
| created_at | DATETIME | 创建时间 |

### words 表
单词明细

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| tenant_id | INTEGER | 所属租户ID |
| book_id | INTEGER | 所属单词本ID |
| spelling | TEXT | 单词英文拼写 |
| meaning | TEXT | 单词中文含义 |
| sentence | TEXT | 例句 |
| phonics_data | TEXT | 自然拼读信息 |
| root_info | TEXT | 词根信息 |
| audio_url | TEXT | 发音音频URL |
| created_at | DATETIME | 创建时间 |

---

## 学习计划表

### study_plans 表
学习计划（学生与单词本的学习关系）

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| tenant_id | INTEGER | 所属租户ID |
| user_id | INTEGER | 学生ID |
| book_id | INTEGER | 单词本ID |
| status | TEXT | 状态: not_started/learning/completed |
| started_at | DATETIME | 开始时间 |
| completed_at | DATETIME | 完成时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**状态说明**:
- **not_started**: 未开始学习
- **learning**: 学习中（同一时间只能有一个单词本处于此状态）
- **completed**: 已完成学习（仍可继续复习）

### learning_tasks 表
学习任务（每次练习任务记录）

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| tenant_id | INTEGER | 所属租户ID |
| user_id | INTEGER | 学生ID |
| book_id | INTEGER | 单词本ID |
| word_ids | TEXT | 单词ID列表 (JSON数组) |
| total_count | INTEGER | 单词总数 |
| status | TEXT | 状态: pending/in_progress/completed |
| started_at | DATETIME | 开始时间 |
| ended_at | DATETIME | 结束时间 |
| correct_count | INTEGER | 正确次数 |
| wrong_count | INTEGER | 错误次数 |
| hint_count | INTEGER | 提示次数 |
| duration_seconds | INTEGER | 练习时长（秒） |
| created_at | DATETIME | 创建时间 |

**任务生成逻辑**:
- 每次从单词本中选取最多 **20 个**未学习的单词
- 未学习的定义：不在已完成的 learning_tasks 的 word_ids 中
- 已完成的单词本继续学习时，随机选取 20 个单词

### wrong_words 表
错词本

| 字段名称 | 字段类型 | 描述 |
| :--- | :--- | :--- |
| id | INTEGER | 主键，自增 |
| tenant_id | INTEGER | 所属租户ID |
| user_id | INTEGER | 学生ID |
| word_id | INTEGER | 单词ID |
| book_id | INTEGER | 单词本ID |
| task_id | INTEGER | 任务ID |
| correct_spelling | TEXT | 正确拼写 |
| wrong_spelling | TEXT | 错误拼写 |
| created_at | DATETIME | 创建时间 |
| reviewed | INTEGER | 是否已复习 0/1 |

---

# 学生练习平台

## 核心流程

```
首页 → 选择单词本 → 开始学习 → 创建任务(20词) → 完成练习 → 继续学习/完成学习
```

### 1. 首页
- 显示当前学习中的单词本及进度
- 如无学习中单词本，显示"去挑选单词本"和上次完成的记录
- 显示统计数据：已学单词、完成任务、学习天数、正确率

### 2. 单词本列表
- 展示所有上线的单词本
- 按状态排序：学习中 > 未开始 > 已完成
- 显示学习进度（完成单词数 / 总单词数）
- 提供操作按钮：开始学习 / 继续学习 / 暂停 / 查看学习情况

### 3. 打卡练习
**正面（答题）**:
- 显示单词中文含义
- 语音播报按钮
- 首字母提示 + 输入框
- 提示按钮、检查答案按钮

**反面（查看答案）**:
- 显示完整单词拼写
- 中文含义、自然拼读、例句
- 下一个按钮

**交互逻辑**:
- 答对: 播放成功音效，显示烟花动画，进入下一个单词
- 答错: 播放错误音效，记录到错词本，可继续重试或查看答案

### 4. 学习统计
- 累计学习单词数
- 完成任务数
- 学习天数
- 正确率

### 5. 错词本
- 展示所有错误拼写记录
- 可重新练习错题
- 按单词本筛选

---

# 本地开发环境

使用 Wrangler CLI 进行本地开发：

```bash
# 安装依赖
npm install

# 启动所有服务
npm run dev:api      # 后端 API (端口 8787)
npm run dev:admin    # 管理后台 (端口 5173)
npm run dev:desktop  # 学生端 Web 开发 (端口 5175)

# 数据库操作
cd apps/api
npx wrangler d1 execute citour-db --local --file=schema.sql
```

> **说明**：`apps/desktop` 基于 Tauri + React，同时支持：
> - **Web 端开发**：运行 `npm run dev:desktop`，浏览器访问 http://localhost:5175
> - **桌面应用打包**：进入 `apps/desktop` 目录，运行 `npm run tauri:dev` 或 `npm run tauri:build`

| 阶段 | 命令 | 数据库 |
|------|------|--------|
| 开发 | `npx wrangler dev --port 8787` | 本地 SQLite |
| 测试 | `npx wrangler dev --remote` | 远程 D1 |
| 生产 | `npx wrangler deploy` | 远程 D1 |