# 使用官方 Node.js 镜像
FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./
COPY .npmrc ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN pnpm run db:generate

# 构建应用
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 切换到非 root 用户
USER nodejs

# 启动命令
CMD ["pnpm", "start"]