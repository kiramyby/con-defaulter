# 违约客户管理系统后端服务

基于 Node.js + TypeScript + Express + Prisma + Supabase 构建的违约客户管理系统后端服务。

## 🏗️ 技术架构

- **运行环境**: Node.js 18+
- **开发语言**: TypeScript
- **Web框架**: Express.js
- **数据库**: Supabase PostgreSQL
- **ORM**: Prisma
- **包管理**: pnpm
- **参数验证**: Zod
- **日志**: Winston
- **安全**: Helmet, CORS

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 pnpm (如果尚未安装)
npm install -g pnpm

# 安装依赖
pnpm install

# 复制环境变量文件
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件，配置以下变量：

```env
# 数据库配置 - 替换为你的 Supabase 连接串
DATABASE_URL="postgresql://username:password@your-project.supabase.co:5432/postgres"

# JWT密钥 - 生成一个安全的密钥
JWT_SECRET=your-super-secret-jwt-key-here
```

### 3. 数据库设置

```bash
# 生成 Prisma 客户端
pnpm run db:generate

# 推送数据库架构到 Supabase
pnpm run db:push

# 打开 Prisma Studio (可选)
pnpm run db:studio
```

### 4. 运行应用

```bash
# 开发模式
pnpm run dev

# 生产模式
pnpm run build
pnpm start
```

服务器将在 `http://localhost:3000` 启动。

## 📚 API 接口

### 违约原因管理
- `GET /api/v1/default-reasons` - 查询违约原因列表
- `POST /api/v1/default-reasons` - 创建违约原因
- `PUT /api/v1/default-reasons/:id` - 更新违约原因
- `DELETE /api/v1/default-reasons/:id` - 删除违约原因

### 违约认定申请
- `POST /api/v1/default-applications` - 提交违约认定申请
- `GET /api/v1/default-applications` - 查询申请列表
- `GET /api/v1/default-applications/:id` - 获取申请详情
- `POST /api/v1/default-applications/:id/approve` - 审核申请

### 违约客户查询
- `GET /api/v1/default-customers` - 查询违约客户列表
- `GET /api/v1/default-customers/export` - 导出违约客户
- `GET /api/v1/default-customers/renewable` - 查询可重生客户

### 违约重生管理
- `GET /api/v1/renewal-reasons` - 获取重生原因列表
- `POST /api/v1/renewals` - 提交重生申请
- `POST /api/v1/renewals/:id/approve` - 审核重生申请

## 🛠️ 开发脚本

```bash
# 开发与构建
pnpm run dev          # 启动开发服务器
pnpm run build        # 构建生产版本
pnpm start           # 启动生产服务器

# 数据库管理
pnpm run db:generate  # 生成 Prisma 客户端
pnpm run db:push     # 推送数据库架构
pnpm run db:migrate  # 运行数据库迁移
pnpm run db:studio   # 打开 Prisma Studio

# 代码质量
pnpm run lint        # ESLint 检查
pnpm run lint:fix    # 自动修复 ESLint 问题
pnpm run format      # Prettier 格式化
pnpm run type-check  # TypeScript 类型检查

# 测试
pnpm run test        # 运行测试
pnpm run test:watch  # 监视模式运行测试

# 工具
pnpm run clean       # 清理构建目录
```

## 🔧 pnpm 优势

使用 pnpm 替代 npm 的好处：

- **节省磁盘空间**: 通过硬链接避免重复包
- **更快的安装速度**: 并行安装和智能缓存
- **严格的依赖管理**: 避免幽灵依赖问题
- **更好的 monorepo 支持**: 内置 workspace 功能

## 📁 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器层
│   ├── services/        # 业务逻辑层
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由定义
│   ├── types/           # 类型定义
│   ├── utils/           # 工具函数
│   ├── app.ts           # 应用程序入口
│   └── index.ts         # 服务器启动文件
├── prisma/
│   └── schema.prisma    # 数据库模型定义
├── .npmrc              # pnpm 配置
├── package.json        # 项目配置和依赖
└── pnpm-lock.yaml      # 锁定文件
```

## 🚢 部署指南

### Docker 部署

```dockerfile
FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# 安装依赖
RUN pnpm install --frozen-lockfile --prod

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
```

### 环境要求

确保以下版本：
- Node.js >= 18.0.0
- pnpm >= 8.0.0

## 🐛 故障排除

### 常见问题

1. **pnpm 命令未找到**
   ```bash
   npm install -g pnpm
   ```

2. **依赖安装失败**
   ```bash
   # 清理缓存并重新安装
   pnpm store prune
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **数据库连接问题**
   ```bash
   # 检查数据库连接
   pnpm run db:generate
   npx prisma db pull
   ```

## 📄 许可证

MIT License