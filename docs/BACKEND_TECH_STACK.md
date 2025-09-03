# 后端技术栈与实现文档

## 📖 项目概述

违约客户管理系统后端服务，采用现代化的 Node.js + TypeScript 技术栈，实现了完整的 RESTful API 服务，包含用户认证、权限管理、数据 CRUD、文件上传等核心功能。

## 🛠️ 技术栈

### 核心框架

#### Node.js + TypeScript
- **Node.js**: `>=18.0.0` - JavaScript 运行时环境
- **TypeScript**: `5.9.2` - 类型安全的 JavaScript 超集
- **tsx**: `4.20.5` - 开发时 TypeScript 执行器

#### Web 框架
- **Express.js**: `4.21.2` - 快速、极简的 Node.js Web 框架
- **架构模式**: MVC (Model-View-Controller)

### 数据库技术

#### ORM 框架
- **Prisma**: `5.22.0` - 现代化的数据库 ORM
  - 类型安全的数据库访问
  - 自动生成的 TypeScript 客户端
  - 数据库迁移管理
  - Schema 定义语言

#### 数据库
- **PostgreSQL**: Supabase 托管的 PostgreSQL 数据库
- **连接池**: PgBouncer 连接池优化
- **连接管理**: 自动重连、健康检查机制

### 认证与安全

#### 认证系统
- **JWT (JSON Web Tokens)**: `9.0.2` - 无状态认证
- **bcrypt**: `6.0.0` - 密码哈希加密
- **独立认证系统**: 基于数据库的用户管理

#### 安全中间件
- **Helmet**: `7.2.0` - HTTP 安全头设置
- **CORS**: `2.8.5` - 跨域资源共享配置
- **输入验证**: Zod 数据验证库

### API 文档

#### 文档生成
- **Swagger**: 基于 JSDoc 注释自动生成 API 文档
- **swagger-jsdoc**: `6.2.8` - Swagger 规范生成
- **swagger-ui-express**: `5.0.1` - 交互式 API 文档界面

### 开发工具

#### 代码质量
- **ESLint**: `8.57.1` - JavaScript/TypeScript 代码检查
- **Prettier**: `3.6.2` - 代码格式化
- **TypeScript ESLint**: `6.21.0` - TypeScript 专用 ESLint 规则

#### 测试框架
- **Jest**: `29.7.0` - JavaScript 测试框架（已配置但暂未实现测试用例）
- **ts-jest**: `29.4.1` - TypeScript Jest 预设

#### 包管理
- **pnpm**: `8.15.0` - 快速、节省磁盘空间的包管理器

## 🏗️ 系统架构

### 分层架构

```
┌─────────────────────────────────────┐
│             API Layer               │
│    (Routes + Middleware)            │
├─────────────────────────────────────┤
│          Controller Layer           │
│     (Business Logic)                │
├─────────────────────────────────────┤
│           Service Layer             │
│    (Domain Logic)                   │
├─────────────────────────────────────┤
│            Data Layer               │
│  (Prisma ORM + PostgreSQL)         │
└─────────────────────────────────────┘
```

### 核心模块

#### 1. 认证模块 (Authentication)
```typescript
// 核心文件
src/controllers/AuthController.ts
src/middleware/auth.ts
src/utils/validation.ts (authValidation)
```
- JWT Token 生成与验证
- 用户登录、登出、令牌刷新
- 用户注册（管理员权限）
- 密码加密与验证

#### 2. 权限管理 (Authorization)
```typescript
// 中间件
export const requireRole = (allowedRoles: UserRole[])
export const requireDataAccess = (checkOwnership: boolean)
```
- 基于角色的访问控制 (RBAC)
- 三种用户角色：ADMIN、OPERATOR、AUDITOR
- 数据级别权限控制

#### 3. 违约管理 (Default Management)
```typescript
// 核心模块
src/controllers/DefaultApplicationController.ts
src/controllers/DefaultCustomerController.ts
src/controllers/DefaultReasonController.ts
src/services/DefaultApplicationService.ts
```
- 违约申请 CRUD 操作
- 违约客户管理
- 违约原因配置
- 申请审批流程

#### 4. 续期管理 (Renewal Management)
```typescript
// 核心模块
src/controllers/RenewalController.ts
src/services/RenewalService.ts
```
- 续期申请提交
- 续期审批流程
- 续期原因管理

### 数据库设计

#### 核心表结构

##### 用户表 (users)
```sql
- id: BigInt (主键)
- username: String (唯一)
- real_name: String
- email: String (唯一)
- role: UserRole (ADMIN/OPERATOR/AUDITOR)
- status: UserStatus (ACTIVE/INACTIVE)
- hashed_password: String
```

##### 客户表 (customers)
```sql
- id: BigInt (主键)
- customer_code: String (唯一)
- customer_name: String
- industry: String
- region: String
- status: CustomerStatus (NORMAL/DEFAULT/RENEWAL)
```

##### 违约申请表 (default_applications)
```sql
- id: BigInt (主键)
- application_id: String (唯一)
- customer_id: BigInt (外键)
- severity: Severity (LOW/MEDIUM/HIGH)
- status: ApplicationStatus (PENDING/APPROVED/REJECTED)
```

## 🔧 核心功能实现

### 1. 认证系统实现

#### JWT Token 结构
```typescript
interface JWTPayload {
  id: string;           // 用户 UUID
  email: string;        // 用户邮箱
  dbId: number;         // 数据库 ID
  username: string;     // 用户名
  realName: string;     // 真实姓名
  role: UserRole;       // 用户角色
  status: UserStatus;   // 用户状态
  department: string;   // 所属部门
}
```

#### 密码安全
```typescript
// 密码加密
const hashedPassword = await bcrypt.hash(password, 10);

// 密码验证
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 2. 数据验证系统

#### Zod 验证规则
```typescript
// 登录验证
export const authValidation = {
  login: z.object({
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(6, '密码至少6位'),
  }),
}

// 申请创建验证
export const defaultApplicationValidation = {
  create: z.object({
    customerName: z.string().min(1).max(255),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    defaultReasons: z.array(z.number().int().positive()).min(1),
  }),
}
```

### 3. 错误处理机制

#### 统一响应格式
```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  timestamp: string;
}

// 成功响应
ResponseUtil.success(res, data, message, statusCode);

// 错误响应
ResponseUtil.badRequest(res, message);
ResponseUtil.unauthorized(res, message);
ResponseUtil.internalError(res, message);
```

### 4. 日志系统

#### Winston 日志配置
```typescript
// 日志级别
levels: {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

// 日志格式
format: winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)
```

## 🚀 部署与运维

### 环境配置

#### 必需环境变量
```env
# 应用配置
NODE_ENV=development
PORT=3001

# 数据库配置
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS 配置
CORS_ORIGIN=http://localhost:3000
```

### 脚本命令

#### 开发命令
```json
"dev": "tsx watch src/index.ts",           // 开发服务器
"build": "tsc",                            // 构建生产版本
"start": "node dist/index.js",             // 启动生产服务器
```

#### 数据库命令
```json
"db:generate": "prisma generate",          // 生成 Prisma 客户端
"db:push": "prisma db push",               // 推送 schema 到数据库
"db:migrate": "prisma migrate dev",        // 运行数据库迁移
"db:studio": "prisma studio",              // 启动 Prisma Studio
```

#### 代码质量命令
```json
"lint": "eslint src --ext .ts",            // 代码检查
"lint:fix": "eslint src --ext .ts --fix",  // 自动修复代码问题
"format": "prettier --write src/**/*.ts",  // 代码格式化
"type-check": "tsc --noEmit",              // 类型检查
```

### 性能优化

#### 数据库连接优化
```typescript
// 连接池配置
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=10"

// 健康检查机制
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
};
```

#### 缓存策略
- HTTP 响应压缩 (compression)
- 静态文件缓存
- 数据库查询优化

## 🧪 测试策略

### 测试框架配置
虽然项目中配置了 Jest 测试框架，但目前**暂未实现具体的测试用例**。

```json
// package.json 中的测试脚本
{
  "test": "jest",
  "test:watch": "jest --watch"
}
```

### 推荐的测试实现计划
- **单元测试**: 服务层和工具函数测试
  - 认证逻辑测试
  - 数据验证测试
  - 业务逻辑测试
- **集成测试**: API 端点测试
  - 登录/注册流程测试
  - CRUD 操作测试
  - 权限验证测试
- **数据库测试**: Prisma 模型和查询测试

## 🔒 安全措施

### 认证安全
- JWT Token 过期机制
- 密码强度要求
- 登录失败日志记录

### 输入安全
- Zod 数据验证
- SQL 注入防护 (Prisma ORM)
- XSS 防护 (Helmet)

### API 安全
- 速率限制
- CORS 配置
- HTTP 安全头设置

## 📈 监控与日志

### 日志记录
- 操作日志记录
- 错误日志记录
- 访问日志记录

### 监控指标
- API 响应时间
- 数据库连接状态
- 系统资源使用情况

## 🔮 未来规划

### 测试完善
- [ ] 实现单元测试用例
- [ ] 添加 API 集成测试
- [ ] 数据库测试覆盖
- [ ] CI/CD 测试流水线

### 功能扩展
- [ ] 数据导出功能
- [ ] 批量操作支持
- [ ] 实时通知系统
- [ ] 高级查询功能

### 技术改进
- [ ] Redis 缓存集成
- [ ] 消息队列系统
- [ ] 微服务架构
- [ ] Docker 容器化

### 性能优化
- [ ] 数据库查询优化
- [ ] API 响应缓存
- [ ] 负载均衡
- [ ] CDN 集成

## 📚 相关文档

- [用户登录信息文档](./USER_LOGIN.md)
- [API 文档](./API.md)
- [数据库设计文档](./sql.md)
- [Prisma Schema 文档](../backend/prisma/schema.prisma)
- [API 交互文档](http://localhost:3001/api-docs)