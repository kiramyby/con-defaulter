# 违约客户管理系统 API Raw Documentation

## 基础配置

```
Base URL: /api/v1
Content-Type: application/json
Authorization: Bearer {token}
```

## 通用响应格式

```json
{
  "code": 200,
  "message": "success", 
  "data": {},
  "timestamp": "2022-02-11T10:30:00"
}
```

## 错误码
- 200: 成功
- 400: 请求参数错误
- 401: 未授权
- 403: 权限不足
- 404: 资源不存在
- 500: 服务器内部错误

---

## 违约原因管理

### GET /default-reasons
查询违约原因列表

**Query Parameters:**
- page: int (default: 1)
- size: int (default: 10)
- enabled: boolean

**Response:**
```json
{
  "total": 7,
  "page": 1,
  "size": 10,
  "list": [{
    "id": 1,
    "reason": "头寸缺口过多",
    "detail": "6个月内，交易对手技术性或资金等原因，给当天结算带来头寸缺口2次以上",
    "enabled": true,
    "sortOrder": 1,
    "createTime": "2022-02-11T10:30:00",
    "updateTime": "2022-02-11T10:30:00"
  }]
}
```

### POST /default-reasons
新增违约原因

**Body:**
```json
{
  "reason": "string",
  "detail": "string",
  "enabled": boolean,
  "sortOrder": int
}
```

### PUT /default-reasons/{id}
更新违约原因

**Body:**
```json
{
  "reason": "string",
  "detail": "string", 
  "enabled": boolean,
  "sortOrder": int
}
```

### DELETE /default-reasons/{id}
删除违约原因

---

## 违约认定申请

### POST /default-applications
提交违约认定申请

**Body:**
```json
{
  "customerName": "string",
  "latestExternalRating": "string",
  "defaultReasons": [1, 3, 5],
  "severity": "HIGH|MEDIUM|LOW",
  "remark": "string",
  "attachments": [{
    "fileName": "string",
    "fileUrl": "string",
    "fileSize": int
  }]
}
```

**Response:**
```json
{
  "applicationId": 12345,
  "customerId": 1001,
  "customerName": "string",
  "status": "PENDING",
  "createTime": "2022-02-11T10:30:00"
}
```

### GET /default-applications
查询违约认定申请列表

**Query Parameters:**
- page: int
- size: int
- status: string
- customerName: string
- applicant: string
- startTime: string
- endTime: string
- severity: string

**Response:**
```json
{
  "total": 50,
  "page": 1,
  "size": 10,
  "list": [{
    "applicationId": 12345,
    "customerId": 1001,
    "customerName": "string",
    "applicant": "string",
    "status": "PENDING",
    "severity": "HIGH",
    "defaultReasons": [1],
    "createTime": "2022-02-11T10:30:00",
    "latestExternalRating": "A+"
  }]
}
```

### GET /default-applications/{applicationId}
获取违约认定申请详情

**Response:**
```json
{
  "applicationId": 12345,
  "customerId": 1001,
  "customerName": "string",
  "latestExternalRating": "A+",
  "defaultReasons": [1],
  "severity": "HIGH",
  "remark": "string",
  "attachments": [{
    "fileName": "string",
    "fileUrl": "string",
    "fileSize": int
  }],
  "applicant": "string",
  "status": "PENDING",
  "createTime": "2022-02-11T10:30:00",
  "approveTime": null,
  "approver": null,
  "approveRemark": null
}
```

---

## 违约认定审核

### POST /default-applications/{applicationId}/approve
审核违约认定申请

**Body:**
```json
{
  "approved": boolean,
  "remark": "string"
}
```

**Response:**
```json
{
  "applicationId": 12345,
  "status": "APPROVED|REJECTED",
  "approver": "string",
  "approveTime": "2022-02-11T14:30:00"
}
```

### POST /default-applications/batch-approve
批量审核违约认定申请

**Body:**
```json
{
  "applications": [{
    "applicationId": 12345,
    "approved": boolean,
    "remark": "string"
  }]
}
```

**Response:**
```json
{
  "successCount": 2,
  "failCount": 0,
  "details": [{
    "applicationId": 12345,
    "success": boolean,
    "message": "string"
  }]
}
```

---

## 违约信息查询

### GET /default-customers
查询违约客户列表

**Query Parameters:**
- page: int
- size: int
- customerName: string
- status: string
- severity: string
- startTime: string
- endTime: string

**Response:**
```json
{
  "total": 100,
  "page": 1,
  "size": 10,
  "list": [{
    "customerId": 1001,
    "customerName": "string",
    "status": "DEFAULT",
    "defaultReasons": [1],
    "severity": "HIGH",
    "applicant": "string",
    "applicationTime": "2022-02-11T10:30:00",
    "approveTime": "2022-02-11T14:30:00",
    "latestExternalRating": "C+"
  }]
}
```

### GET /default-customers/export
导出违约客户列表
返回Excel文件流

---

## 违约重生管理

### GET /default-customers/renewable
查询可重生客户列表

**Query Parameters:**
- page: int
- size: int
- customerName: string

**Response:**
```json
{
  "total": 20,
  "page": 1,
  "size": 10,
  "list": [{
    "customerId": 1001,
    "customerName": "string",
    "defaultReasons": [1],
    "severity": "HIGH",
    "applicant": "string",
    "applicationTime": "2022-02-11T10:30:00",
    "approveTime": "2022-02-11T14:30:00",
    "latestExternalRating": "B+"
  }]
}
```

### POST /renewals
提交违约重生申请

**Body:**
```json
{
  "customerId": 1001,
  "renewalReason": 1,
  "remark": "string"
}
```

**Response:**
```json
{
  "renewalId": 2001,
  "customerId": 1001,
  "customerName": "string",
  "status": "PENDING",
  "createTime": "2022-02-11T15:30:00"
}
```

### GET /renewal-reasons
获取重生原因列表

**Response:**
```json
[{
  "id": 1,
  "reason": "正常结算后解除",
  "enabled": true
}, {
  "id": 2,
  "reason": "在其他金融机构违约解除，或外部评级显示为非违约级别",
  "enabled": true
}]
```

### POST /renewals/{renewalId}/approve
审核违约重生申请

**Body:**
```json
{
  "approved": boolean,
  "remark": "string"
}
```

**Response:**
```json
{
  "renewalId": 2001,
  "status": "APPROVED|REJECTED",
  "approver": "string",
  "approveTime": "2022-02-11T16:30:00"
}
```

---

## 违约统计分析

### GET /statistics/by-industry
按行业统计违约情况

**Query Parameters:**
- year: int
- type: string (DEFAULT|RENEWAL)

**Response:**
```json
{
  "year": 2022,
  "type": "DEFAULT",
  "total": 100,
  "industries": [{
    "industry": "金融业",
    "count": 30,
    "percentage": 30.0,
    "trend": "UP|DOWN|STABLE"
  }]
}
```

### GET /statistics/by-region
按区域统计违约情况

**Query Parameters:**
- year: int
- type: string (DEFAULT|RENEWAL)

**Response:**
```json
{
  "year": 2022,
  "type": "DEFAULT", 
  "total": 100,
  "regions": [{
    "region": "华东地区",
    "count": 40,
    "percentage": 40.0,
    "trend": "STABLE"
  }]
}
```

### GET /statistics/trend
获取趋势统计数据

**Query Parameters:**
- dimension: string (INDUSTRY|REGION)
- target: string
- startYear: int
- endYear: int

**Response:**
```json
{
  "dimension": "INDUSTRY",
  "target": "金融业",
  "trend": [{
    "year": 2020,
    "defaultCount": 25,
    "renewalCount": 5
  }]
}
```

---

## 文件上传

### POST /files/upload
上传附件

**Content-Type:** multipart/form-data
**Body:** file (binary)

**Response:**
```json
{
  "fileId": "string",
  "fileName": "string", 
  "fileUrl": "string",
  "fileSize": int,
  "uploadTime": "2022-02-11T10:30:00"
}
```

---

## 约束条件

- 时间格式: ISO 8601 (YYYY-MM-DDTHH:mm:ss)
- 分页起始: page=1
- 文件限制: 单文件≤10MB, 支持pdf/doc/docx/xls/xlsx
- 频率限制: 100次/秒/用户
- 统计数据: 每日凌晨更新
