# 用户登录信息文档

## 测试用户账号

系统提供以下测试用户账号，密码请联系开发团队获取或查看内部文档

### 1. 管理员账号

- **用户名**: `test_admin`
- **邮箱**: `test.admin@example.com`
- **角色**: `ADMIN`
- **部门**: 测试部门
- **权限**: 系统最高权限，可以管理所有功能

### 2. 操作员账号

- **用户名**: `test_operator`
- **邮箱**: `test.operator@example.com`
- **角色**: `OPERATOR`
- **部门**: 业务部门
- **权限**: 可以提交违约申请、查看自己的申请

### 3. 审核员账号

- **用户名**: `test_auditor`
- **邮箱**: `test.auditor@example.com`
- **角色**: `AUDITOR`
- **部门**: 风控部门
- **权限**: 可以审核申请、查看所有申请数据

### 4. 普通用户1

- **用户名**: `test_user1`
- **邮箱**: `test.user1@example.com`
- **角色**: `OPERATOR`
- **部门**: 业务部门
- **状态**: 正常

### 5. 普通用户2（已禁用）

- **用户名**: `test_user2`
- **邮箱**: `test.user2@example.com`
- **角色**: `AUDITOR`
- **部门**: 业务部门
- **状态**: 已禁用

## 登录方式

### 1. API登录

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "test.admin@example.com",
  "password": "请联系开发团队获取测试密码"
}
```

### 2. 响应格式

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwidXNlcm5hbWUiOiJ0ZXN0X2FkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.abcdef123456789",
    "expires_in": 86400,
    "token_type": "bearer",
    "user": {
      "id": "1",
      "email": "test.admin@example.com",
      "dbId": 1,
      "username": "test_admin",
      "realName": "测试管理员",
      "role": "ADMIN",
      "status": "ACTIVE",
      "department": "测试部门"
    }
  },
  "timestamp": "2024-09-03T08:30:00.000Z"
}
```

## 权限说明

### ADMIN（管理员）

- ✅ 用户管理：创建、修改、删除用户
- ✅ 系统配置：管理违约原因、续期原因
- ✅ 数据管理：查看、导出所有数据
- ✅ 审核权限：审批违约申请和续期申请
- ✅ 日志查看：查看操作日志

### OPERATOR（操作员）

- ✅ 申请提交：提交违约申请、续期申请
- ✅ 查看自己的申请记录
- ✅ 上传相关附件
- ❌ 无法查看其他人的申请
- ❌ 无审核权限
- ❌ 无用户管理权限

### AUDITOR（审核员）

- ✅ 审核权限：审批违约申请和续期申请
- ✅ 数据查看：查看所有申请数据
- ✅ 数据导出：导出相关报表
- ✅ 日志查看：查看操作日志
- ❌ 无法提交新申请
- ❌ 无用户管理权限

## 认证机制

### JWT Token

- **Access Token**: 有效期24小时，用于API访问认证
- **Refresh Token**: 有效期7天，用于刷新Access Token
- **算法**: HS256
- **Header**: `Authorization: Bearer <access_token>`

### 令牌刷新

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwidXNlcm5hbWUiOiJ0ZXN0X2FkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.refresh_token_signature"
}
```

## 数据库结构

测试用户存储在 `users` 表中，包含以下字段：

- `id`: 用户唯一标识
- `username`: 用户名（唯一）
- `real_name`: 真实姓名
- `email`: 邮箱地址（唯一）
- `phone`: 手机号
- `department`: 所属部门
- `role`: 用户角色（ADMIN/OPERATOR/AUDITOR）
- `status`: 用户状态（ACTIVE/INACTIVE）
- `hashed_password`: 加密后的密码
- `created_by`: 创建者
- `create_time`: 创建时间
- `update_time`: 更新时间
- `last_login_time`: 最后登录时间

## 安全说明

### 密码安全

- 使用 bcrypt 加密，加盐轮数为10
- 密码要求：至少6位，包含大小写字母和数字
- 测试密码：请联系开发团队获取

### 登录安全

- 登录失败会记录日志
- 支持IP地址和User-Agent记录
- 自动记录最后登录时间

## 测试建议

1. **功能测试**: 使用不同角色账号测试相应权限
2. **安全测试**: 验证未授权访问被正确拒绝
3. **性能测试**: 测试大量请求下的认证性能
4. **集成测试**: 验证前后端认证流程完整性

## 注意事项

⚠️ **重要提醒**:

1. 测试用户仅用于开发和测试环境
2. 生产环境请删除所有测试账号
3. 生产环境请使用强密码和定期更换
4. 建议启用双因素认证（2FA）
5. 定期检查用户权限和状态