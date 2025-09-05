# 违约客户管理系统 API接口文档

## 1. 接口概述

### 1.1 基本信息
- 系统名称：违约客户管理系统
- 版本：v1.0
- 基础URL：`http://localhost:3001/api/v1`
- 协议：HTTP
- 数据格式：JSON

### 1.2 通用说明
- 所有接口都需要在Header中携带认证token（除登录、注册等公开接口外）
- 请求和响应的Content-Type均为application/json
- 时间格式统一使用ISO 8601标准：YYYY-MM-DDTHH:mm:ss.sssZ

### 1.3 认证方式
```
JWT Bearer Token
Authorization: Bearer {access_token}
```

### 1.4 通用响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-09-05T10:30:00.000Z"
}
```

**响应码说明：**
- 200：成功
- 201：创建成功
- 400：请求参数错误
- 401：未授权/需要认证token
- 403：权限不足
- 404：资源不存在
- 500：服务器内部错误

### 1.5 权限角色说明
- **ADMIN**: 管理员，拥有所有权限
- **AUDITOR**: 审核员，负责审核申请，可查看所有数据
- **OPERATOR**: 操作员，可创建申请，只能查看自己的数据
- **USER**: 普通用户，基本查看权限

---

## 2. 系统接口

### 2.1 健康检查
**接口地址：** `GET /health`  
**接口描述：** 检查API服务是否正常运行  
**权限要求：** 无

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2024-09-05T10:30:00.000Z"
}
```

---

## 3. 认证管理接口

### 3.1 用户登录
**接口地址：** `POST /auth/login`  
**接口描述：** 用户邮箱密码登录，获取JWT令牌  
**权限要求：** 无

**请求参数：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expires_in": 1800,
    "token_type": "bearer",
    "user": {
      "id": "1",
      "email": "user@example.com",
      "dbId": 1,
      "username": "testuser",
      "realName": "测试用户",
      "role": "ADMIN",
      "status": "ACTIVE",
      "department": "IT部门"
    }
  },
  "timestamp": "2024-09-05T10:30:00.000Z"
}
```

### 3.2 用户登出
**接口地址：** `POST /auth/logout`  
**接口描述：** 用户登出，撤销refresh token  
**权限要求：** 需要认证

**请求参数：**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

### 3.3 刷新访问令牌
**接口地址：** `POST /auth/refresh`  
**接口描述：** 使用Refresh Token轮转机制刷新访问令牌  
**权限要求：** 无

**请求参数：**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

### 3.4 获取当前用户信息
**接口地址：** `GET /auth/profile`  
**接口描述：** 获取当前登录用户的详细信息  
**权限要求：** 需要认证

### 3.5 更新个人信息
**接口地址：** `PUT /auth/profile`  
**接口描述：** 用户更新自己的基本信息  
**权限要求：** 需要认证

### 3.6 修改密码
**接口地址：** `PUT /auth/password`  
**接口描述：** 用户修改自己的登录密码  
**权限要求：** 需要认证

### 3.7 用户注册（管理员）
**接口地址：** `POST /auth/register`  
**接口描述：** 创建新用户账号，只有ADMIN可以创建  
**权限要求：** ADMIN权限

### 3.8 用户自助注册
**接口地址：** `POST /auth/self-register`  
**接口描述：** 新用户自行创建账号，默认角色为USER  
**权限要求：** 无

### 3.9 获取用户会话列表
**接口地址：** `GET /auth/sessions`  
**接口描述：** 获取当前用户的所有活跃会话信息  
**权限要求：** 需要认证

### 3.10 撤销所有其他会话
**接口地址：** `DELETE /auth/sessions`  
**接口描述：** 撤销当前用户的所有其他会话（除当前会话外）  
**权限要求：** 需要认证

### 3.11 撤销指定会话
**接口地址：** `DELETE /auth/sessions/{sessionId}`  
**接口描述：** 撤销指定的会话，实现远程登出功能  
**权限要求：** 需要认证

---

## 4. 用户管理接口

### 4.1 获取用户列表
**接口地址：** `GET /users`  
**接口描述：** 获取系统中所有用户的分页列表，支持条件查询  
**权限要求：** ADMIN权限

**查询参数：**
- `page`: 页码（默认1）
- `size`: 每页大小（默认10，最大100）
- `role`: 用户角色过滤
- `status`: 用户状态过滤
- `keyword`: 关键字搜索（用户名、姓名、邮箱、部门）

### 4.2 获取用户详情
**接口地址：** `GET /users/{userId}`  
**接口描述：** 根据用户ID获取用户详细信息  
**权限要求：** ADMIN权限

### 4.3 更新用户状态
**接口地址：** `PUT /users/{userId}/status`  
**接口描述：** 更新指定用户的状态（启用/禁用）  
**权限要求：** ADMIN权限

### 4.4 更新用户信息
**接口地址：** `PUT /users/{userId}`  
**接口描述：** 管理员更新指定用户的所有信息  
**权限要求：** ADMIN权限

### 4.5 重置用户密码
**接口地址：** `PUT /users/{userId}/password`  
**接口描述：** 管理员重置指定用户的密码  
**权限要求：** ADMIN权限

### 4.6 删除用户
**接口地址：** `DELETE /users/{userId}`  
**接口描述：** 删除指定用户（软删除）  
**权限要求：** ADMIN权限

---

## 5. 违约原因管理接口

### 5.1 查询违约原因列表
**接口地址：** `GET /default-reasons`  
**接口描述：** 获取违约原因的分页列表，支持条件查询  
**权限要求：** ADMIN、OPERATOR权限

**查询参数：**
- `page`: 页码（默认1）
- `size`: 每页大小（默认10，最大100）
- `reasonName`: 原因名称（模糊查询）
- `isEnabled`: 是否启用

**响应示例：**
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "total": 7,
    "page": 1,
    "size": 10,
    "list": [
      {
        "id": 1,
        "reason": "头寸缺口过多",
        "detail": "6个月内，交易对手技术性或资金等原因，给当天结算带来头寸缺口2次以上",
        "enabled": true,
        "sortOrder": 1,
        "createTime": "2024-09-05T10:30:00.000Z",
        "updateTime": "2024-09-05T10:30:00.000Z"
      }
    ]
  },
  "timestamp": "2024-09-05T10:30:00.000Z"
}
```

### 5.2 查询启用的违约原因列表
**接口地址：** `GET /default-reasons/enabled`  
**接口描述：** 获取所有启用状态的违约原因，用于申请时选择  
**权限要求：** ADMIN、OPERATOR权限

### 5.3 获取违约原因详情
**接口地址：** `GET /default-reasons/{id}`  
**接口描述：** 根据ID获取违约原因的详细信息  
**权限要求：** ADMIN、OPERATOR权限

### 5.4 创建违约原因
**接口地址：** `POST /default-reasons`  
**接口描述：** 创建新的违约原因  
**权限要求：** ADMIN权限

**请求参数：**
```json
{
  "reason": "违约原因名称",
  "detail": "详细描述",
  "enabled": true,
  "sortOrder": 1
}
```

### 5.5 更新违约原因
**接口地址：** `PUT /default-reasons/{id}`  
**接口描述：** 更新指定违约原因的信息  
**权限要求：** ADMIN权限

### 5.6 删除违约原因
**接口地址：** `DELETE /default-reasons/{id}`  
**接口描述：** 删除指定的违约原因  
**权限要求：** ADMIN权限

### 5.7 批量更新违约原因状态
**接口地址：** `POST /default-reasons/batch-status`  
**接口描述：** 批量启用或禁用违约原因  
**权限要求：** ADMIN权限

**请求参数：**
```json
{
  "ids": [1, 2, 3],
  "enabled": true
}
```

---

## 6. 违约认定申请接口

### 6.1 提交违约认定申请
**接口地址：** `POST /default-applications`  
**接口描述：** 创建新的违约认定申请  
**权限要求：** ADMIN、OPERATOR权限

**请求参数：**
```json
{
  "customerName": "客户名称",
  "latestExternalRating": "A+",
  "defaultReasons": [1, 3, 5],
  "severity": "HIGH",
  "remark": "备注信息",
  "attachments": [
    {
      "fileName": "证明文件.pdf",
      "fileUrl": "https://files.example.com/xxx.pdf",
      "fileSize": 1024000
    }
  ]
}
```

### 6.2 查询违约认定申请列表
**接口地址：** `GET /default-applications`  
**接口描述：** 获取违约认定申请的分页列表，OPERATOR只能查看自己提交的申请  
**权限要求：** 查看全部申请（ADMIN、AUDITOR）或查看自己申请（OPERATOR）权限

**查询参数：**
- `page`: 页码
- `size`: 每页大小
- `status`: 申请状态（PENDING, APPROVED, REJECTED）
- `customerName`: 客户名称（模糊查询）
- `applicant`: 申请人
- `severity`: 严重程度
- `startTime`: 开始时间
- `endTime`: 结束时间

### 6.3 获取违约认定申请详情
**接口地址：** `GET /default-applications/{applicationId}`  
**接口描述：** 根据申请ID获取详细信息，OPERATOR只能查看自己提交的申请  
**权限要求：** 需要数据访问权限检查

### 6.4 审核违约认定申请
**接口地址：** `POST /default-applications/{applicationId}/approve`  
**接口描述：** 审核单个违约认定申请  
**权限要求：** ADMIN、AUDITOR权限

**请求参数：**
```json
{
  "approved": true,
  "remark": "审核意见"
}
```

### 6.5 批量审核违约认定申请
**接口地址：** `POST /default-applications/batch-approve`  
**接口描述：** 批量审核多个违约认定申请  
**权限要求：** ADMIN、AUDITOR权限

---

## 7. 违约客户查询接口

### 7.1 查询违约客户列表
**接口地址：** `GET /default-customers`  
**接口描述：** 获取违约客户的分页列表，OPERATOR只能查看自己申请的违约客户  
**权限要求：** 查看全部客户（ADMIN、AUDITOR）或查看自己客户（OPERATOR）权限

### 7.2 导出违约客户列表
**接口地址：** `GET /default-customers/export`  
**接口描述：** 导出违约客户数据为Excel文件，OPERATOR只能导出自己申请的违约客户  
**权限要求：** 导出全部数据（ADMIN、AUDITOR）或导出自己数据（OPERATOR）权限

### 7.3 查询可续期客户列表
**接口地址：** `GET /default-customers/renewable`  
**接口描述：** 获取可以申请重生的违约客户列表  
**权限要求：** ADMIN、OPERATOR权限

### 7.4 获取违约客户详情
**接口地址：** `GET /default-customers/{customerId}`  
**接口描述：** 根据客户ID获取违约客户的详细信息，OPERATOR只能查看自己申请的违约客户  
**权限要求：** 需要数据访问权限检查

---

## 8. 违约重生管理接口

### 8.1 获取重生原因列表
**接口地址：** `GET /renewal-reasons`  
**接口描述：** 获取所有启用的违约重生原因，用于创建重生申请时选择  
**权限要求：** ADMIN、OPERATOR权限

### 8.2 提交违约重生申请
**接口地址：** `POST /renewals`  
**接口描述：** 为违约客户提交重生申请  
**权限要求：** ADMIN、OPERATOR权限

**请求参数：**
```json
{
  "customerId": 1001,
  "renewalReason": 1,
  "remark": "客户已正常结算，申请重生"
}
```

### 8.3 查询重生申请列表
**接口地址：** `GET /renewals`  
**接口描述：** 获取重生申请的分页列表，OPERATOR只能查看自己提交的申请  
**权限要求：** 查看全部重生申请（ADMIN、AUDITOR）或查看自己重生申请（OPERATOR）权限

### 8.4 获取重生申请详情
**接口地址：** `GET /renewals/{renewalId}`  
**接口描述：** 根据申请ID获取详细信息，OPERATOR只能查看自己提交的申请  
**权限要求：** 查看全部重生申请（ADMIN、AUDITOR）或查看自己重生申请（OPERATOR）权限

### 8.5 审核重生申请
**接口地址：** `POST /renewals/{renewalId}/approve`  
**接口描述：** 审核单个违约重生申请  
**权限要求：** ADMIN、AUDITOR权限

**请求参数：**
```json
{
  "approved": true,
  "remark": "同意重生"
}
```

### 8.6 批量审核重生申请
**接口地址：** `POST /renewals/batch-approve`  
**接口描述：** 批量审核多个违约重生申请  
**权限要求：** ADMIN、AUDITOR权限

---

## 9. 统计分析接口

### 9.1 获取概览统计数据
**接口地址：** `GET /statistics/overview`  
**接口描述：** 获取系统整体统计概览数据，包括申请数量、客户数量等核心指标  
**权限要求：** ADMIN、AUDITOR、OPERATOR权限

**查询参数：**
- `year`: 统计年份（默认2024）

### 9.2 获取按行业统计数据
**接口地址：** `GET /statistics/by-industry`  
**接口描述：** 获取指定年份按行业维度的统计分析数据  
**权限要求：** ADMIN、AUDITOR、OPERATOR权限

**查询参数：**
- `year`: 统计年份（默认2024）
- `type`: 统计类型（DEFAULT, RENEWAL，默认DEFAULT）

**响应示例：**
```json
{
  "code": 200,
  "message": "获取行业统计数据成功",
  "data": {
    "year": 2024,
    "type": "DEFAULT",
    "total": 100,
    "industries": [
      {
        "industry": "金融业",
        "count": 30,
        "percentage": 30.0,
        "trend": "UP"
      },
      {
        "industry": "制造业",
        "count": 25,
        "percentage": 25.0,
        "trend": "DOWN"
      }
    ]
  },
  "timestamp": "2024-09-05T10:30:00.000Z"
}
```

### 9.3 获取按区域统计数据
**接口地址：** `GET /statistics/by-region`  
**接口描述：** 获取指定年份按区域维度的统计分析数据  
**权限要求：** ADMIN、AUDITOR、OPERATOR权限

### 9.4 获取趋势分析数据
**接口地址：** `GET /statistics/trend`  
**接口描述：** 获取指定时间范围内的趋势分析数据  
**权限要求：** ADMIN、AUDITOR权限

**查询参数：**
- `dimension`: 分析维度（INDUSTRY, REGION）
- `target`: 目标行业或区域名称
- `startYear`: 开始年份（默认2020）
- `endYear`: 结束年份（默认2024）

### 9.5 获取可用行业列表
**接口地址：** `GET /statistics/industries`  
**接口描述：** 获取系统中所有可用的行业名称列表  
**权限要求：** ADMIN、AUDITOR、OPERATOR权限

### 9.6 获取可用区域列表
**接口地址：** `GET /statistics/regions`  
**接口描述：** 获取系统中所有可用的区域名称列表  
**权限要求：** ADMIN、AUDITOR、OPERATOR权限

### 9.7 导出统计报告
**接口地址：** `GET /statistics/export`  
**接口描述：** 导出指定年份的统计分析报告  
**权限要求：** ADMIN、AUDITOR权限

**查询参数：**
- `year`: 统计年份（默认2024）
- `type`: 统计类型（DEFAULT, RENEWAL，默认DEFAULT）
- `format`: 导出格式（excel, json，默认excel）

---

## 10. 错误码说明

| 错误码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 | 请求参数错误 | 参数格式错误、缺少必需参数、参数验证失败 |
| 401 | 需要认证token | 未提供token、token无效、token过期 |
| 403 | 权限不足 | 用户角色权限不够、数据访问权限不足 |
| 404 | 资源不存在 | 请求的资源ID不存在 |
| 409 | 资源冲突 | 资源正在使用中无法删除、数据重复 |
| 500 | 服务器内部错误 | 系统异常、数据库错误 |

## 11. 接口变更记录

### v1.0 (2024-09-05)
- 初始版本发布
- 完整的认证管理系统
- 用户管理功能
- 违约原因管理
- 违约认定申请流程
- 违约客户查询
- 违约重生管理
- 统计分析功能
- JWT Token轮转机制
- 基于权限的访问控制

---

## 注意事项

1. **认证机制**: 采用JWT Bearer Token认证，支持Token轮转机制，每次刷新都会生成新的access_token和refresh_token
2. **权限控制**: 基于角色的权限控制（RBAC），不同角色有不同的操作权限
3. **数据访问**: OPERATOR只能查看和操作自己创建的数据，ADMIN和AUDITOR可以查看所有数据
4. **分页查询**: 所有列表接口都支持分页，page从1开始计数，默认每页10条记录
5. **时间格式**: 统一使用ISO 8601格式，包含时区信息
6. **文件上传**: 单个文件最大10MB，支持pdf、doc、docx、xls、xlsx格式
7. **接口限流**: 单用户每秒最多100次请求
8. **审核流程**: 违约认定申请和重生申请都需要经过ADMIN或AUDITOR审核
9. **数据导出**: 支持Excel格式导出，OPERATOR只能导出自己的数据
10. **统计功能**: 提供多维度统计分析，包括行业、区域、趋势分析等

## 关于违约原因管理401错误

如果违约原因管理接口返回401错误，但其他接口正常，可能的原因：

1. **权限不足**: 违约原因查看需要 `VIEW_DEFAULT_REASONS` 权限，只有ADMIN和OPERATOR角色才有此权限
2. **角色检查**: 请确认当前用户的角色是否为ADMIN或OPERATOR
3. **Token有效性**: 检查JWT token是否包含正确的角色信息
4. **权限配置**: 确认权限中间件配置正确

建议检查用户登录信息中的role字段，确保为ADMIN或OPERATOR角色。