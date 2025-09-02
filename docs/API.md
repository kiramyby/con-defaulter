违约客户管理系统 API接口文档
1. 接口概述
1.1 基本信息
- 系统名称：违约客户管理系统
- 版本：v1.0
- 协议：HTTPS
- 数据格式：JSON
1.2 通用说明
- 所有接口都需要在Header中携带认证token
- 请求和响应的Content-Type均为application/json
- 时间格式统一使用ISO 8601标准：YYYY-MM-DDTHH:mm:ss
1.3 认证方式
JWT
Authorization: Bearer {access_token}
可提取身份信息用于数据处理
1.4 通用响应格式
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2022-02-11T10:30:00"
}
响应码说明：
- 200：成功
- 400：请求参数错误
- 401：未授权
- 403：权限不足
- 404：资源不存在
- 500：服务器内部错误
2. 违约原因管理接口
2.1 查询违约原因列表
接口地址：GET /api/v1/default-reasons
接口描述：获取违约原因列表
请求参数：
暂时无法在飞书文档外展示此内容
请求示例：
GET /api/v1/default-reasons?page=1&size=10&enabled=true
响应示例：
{
  "code": 200,
  "message": "success",
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
        "createTime": "2022-02-11T10:30:00",
        "updateTime": "2022-02-11T10:30:00"
      }
    ]
  },
  "timestamp": "2022-02-11T10:30:00"
}
2.2 新增违约原因
接口地址：POST /api/v1/default-reasons
接口描述：新增违约原因
请求参数：
{
  "reason": "违约原因",
  "detail": "详细解释",
  "enabled": true,
  "sortOrder": 1
}
参数说明：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "新增成功",
  "data": {
    "id": 8,
    "reason": "违约原因",
    "detail": "详细描述",
    "enabled": true,
    "sortOrder": 1,
    "createTime": "2022-02-11T10:30:00"
  },
  "timestamp": "2022-02-11T10:30:00"
}
2.3 更新违约原因
接口地址：PUT /api/v1/default-reasons/{id}
接口描述：更新违约原因
路径参数：
暂时无法在飞书文档外展示此内容
请求参数：
{
  "reason": "更新后的违约原因",
  "detail": "更新后的违约原因描述",
  "enabled": false,
  "sortOrder": 2
}
响应示例：
{
  "code": 200,
  "message": "更新成功",
  "data": null,
  "timestamp": "2022-02-11T10:30:00"
}
2.4 删除违约原因
接口地址：DELETE /api/v1/default-reasons/{id}
接口描述：删除违约原因
路径参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "删除成功",
  "data": null,
  "timestamp": "2022-02-11T10:30:00"
}
3. 违约认定申请接口
3.1 提交违约认定申请
接口地址：POST /api/v1/default-applications
接口描述：提交违约认定申请
请求参数：
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
参数说明：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "申请提交成功",
  "data": {
    "applicationId": 12345,
    "customerId": 1001,
    "customerName": "客户名称",
    "status": "PENDING",
    "createTime": "2022-02-11T10:30:00"
  },
  "timestamp": "2022-02-11T10:30:00"
}
3.2 查询违约认定申请列表
接口地址：GET /api/v1/default-applications
接口描述：查询违约认定申请列表
请求参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 50,
    "page": 1,
    "size": 10,
    "list": [
      {
        "applicationId": 12345,
        "customerId": 1001,
        "customerName": "客户名称",
        "applicant": "申请人姓名",
        "status": "PENDING",
        "severity": "HIGH",
        "defaultReasons": [1],
        "createTime": "2022-02-11T10:30:00",
        "latestExternalRating": "A+"
      }
    ]
  },
  "timestamp": "2022-02-11T10:30:00"
}
3.3 获取违约认定申请详情
接口地址：GET /api/v1/default-applications/{applicationId}
接口描述：获取违约认定申请详情
路径参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "applicationId": 12345,
    "customerId": 1001,
    "customerName": "客户名称",
    "latestExternalRating": "A+",
    "defaultReasons": [1],
    "severity": "HIGH",
    "remark": "备注信息",
    "attachments": [
      {
        "fileName": "证明文件.pdf",
        "fileUrl": "https://files.example.com/xxx.pdf",
        "fileSize": 1024000
      }
    ],
    "applicant": "申请人姓名",
    "status": "PENDING",
    "createTime": "2022-02-11T10:30:00",
    "approveTime": null,
    "approver": null,
    "approveRemark": null
  },
  "timestamp": "2022-02-11T10:30:00"
}
4. 违约认定审核接口
4.1 审核违约认定申请
接口地址：POST /api/v1/default-applications/{applicationId}/approve
接口描述：审核违约认定申请
路径参数：
暂时无法在飞书文档外展示此内容
请求参数：
{
  "approved": true,
  "remark": "审核意见"
}
参数说明：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "审核完成",
  "data": {
    "applicationId": 12345,
    "status": "APPROVED",
    "approver": "审核人姓名",
    "approveTime": "2022-02-11T14:30:00"
  },
  "timestamp": "2022-02-11T14:30:00"
}
4.2 批量审核违约认定申请
接口地址：POST /api/v1/default-applications/batch-approve
接口描述：批量审核违约认定申请
请求参数：
{
  "applications": [
    {
      "applicationId": 12345,
      "approved": true,
      "remark": "同意"
    },
    {
      "applicationId": 12346,
      "approved": false,
      "remark": "证据不足"
    }
  ]
}
响应示例：
{
  "code": 200,
  "message": "批量审核完成",
  "data": {
    "successCount": 2,
    "failCount": 0,
    "details": [
      {
        "applicationId": 12345,
        "success": true,
        "message": "审核成功"
      },
      {
        "applicationId": 12346,
        "success": true,
        "message": "审核成功"
      }
    ]
  },
  "timestamp": "2022-02-11T14:30:00"
}
5. 违约信息查询接口
5.1 查询违约客户列表
接口地址：GET /api/v1/default-customers
接口描述：查询违约客户列表
请求参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "size": 10,
    "list": [
      {
        "customerId": 1001,
        "customerName": "违约客户A",
        "status": "DEFAULT",
        "defaultReasons": [1],
        "severity": "HIGH",
        "applicant": "张三",
        "applicationTime": "2022-02-11T10:30:00",
        "approveTime": "2022-02-11T14:30:00",
        "latestExternalRating": "C+"
      }
    ]
  },
  "timestamp": "2022-02-11T10:30:00"
}
5.2 导出违约客户列表
接口地址：GET /api/v1/default-customers/export
接口描述：导出违约客户列表到Excel
请求参数：与查询接口相同
响应：返回Excel文件流
6. 违约重生管理接口
6.1 查询可重生客户列表
接口地址：GET /api/v1/default-customers/renewable
接口描述：查询可申请重生的违约客户列表
请求参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 20,
    "page": 1,
    "size": 10,
    "list": [
      {
        "customerId": 1001,
        "customerName": "违约客户A",
        "defaultReasons": [1],
        "severity": "HIGH",
        "applicant": "张三",
        "applicationTime": "2022-02-11T10:30:00",
        "approveTime": "2022-02-11T14:30:00",
        "latestExternalRating": "B+"
      }
    ]
  },
  "timestamp": "2022-02-11T10:30:00"
}
6.2 提交违约重生申请
接口地址：POST /api/v1/renewals
接口描述：提交违约重生申请
请求参数：
{
  "customerId": 1001,
  "renewalReason": 1,
  "remark": "客户已正常结算，申请重生"
}
参数说明：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "重生申请提交成功",
  "data": {
    "renewalId": 2001,
    "customerId": 1001,
    "customerName": "违约客户A",
    "status": "PENDING",
    "createTime": "2022-02-11T15:30:00"
  },
  "timestamp": "2022-02-11T15:30:00"
}
6.3 查询重生原因列表
接口地址：GET /api/v1/renewal-reasons
接口描述：获取重生原因列表
响应示例：
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "reason": "正常结算后解除",
      "enabled": true
    },
    {
      "id": 2,
      "reason": "在其他金融机构违约解除，或外部评级显示为非违约级别",
      "enabled": true
    }
  ],
  "timestamp": "2022-02-11T10:30:00"
}
6.4 审核违约重生申请
接口地址：POST /api/v1/renewals/{renewalId}/approve
接口描述：审核违约重生申请
路径参数：
暂时无法在飞书文档外展示此内容
请求参数：
{
  "approved": true,
  "remark": "同意重生"
}
响应示例：
{
  "code": 200,
  "message": "重生审核完成",
  "data": {
    "renewalId": 2001,
    "status": "APPROVED",
    "approver": "李四",
    "approveTime": "2022-02-11T16:30:00"
  },
  "timestamp": "2022-02-11T16:30:00"
}
7. 违约统计分析接口
7.1 按行业统计违约情况
接口地址：GET /api/v1/statistics/by-industry
接口描述：按行业统计违约客户情况
请求参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "year": 2022,
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
  "timestamp": "2022-02-11T10:30:00"
}
7.2 按区域统计违约情况
接口地址：GET /api/v1/statistics/by-region
接口描述：按区域统计违约客户情况
请求参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "year": 2022,
    "type": "DEFAULT",
    "total": 100,
    "regions": [
      {
        "region": "华东地区",
        "count": 40,
        "percentage": 40.0,
        "trend": "STABLE"
      },
      {
        "region": "华北地区",
        "count": 30,
        "percentage": 30.0,
        "trend": "UP"
      }
    ]
  },
  "timestamp": "2022-02-11T10:30:00"
}
7.3 获取趋势统计数据
接口地址：GET /api/v1/statistics/trend
接口描述：获取违约趋势统计数据
请求参数：
暂时无法在飞书文档外展示此内容
响应示例：
{
  "code": 200,
  "message": "success",
  "data": {
    "dimension": "INDUSTRY",
    "target": "金融业",
    "trend": [
      {
        "year": 2020,
        "defaultCount": 25,
        "renewalCount": 5
      },
      {
        "year": 2021,
        "defaultCount": 28,
        "renewalCount": 8
      },
      {
        "year": 2022,
        "defaultCount": 30,
        "renewalCount": 10
      }
    ]
  },
  "timestamp": "2022-02-11T10:30:00"
}
8. 文件上传接口
8.1 上传附件
接口地址：POST /api/v1/files/upload
接口描述：上传附件文件
请求参数：
- Content-Type: multipart/form-data
- file: 上传的文件
响应示例：
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "fileId": "f123456",
    "fileName": "证明文件.pdf",
    "fileUrl": "https://files.xquant.com/f123456.pdf",
    "fileSize": 1024000,
    "uploadTime": "2022-02-11T10:30:00"
  },
  "timestamp": "2022-02-11T10:30:00"
}
1. 错误码说明
暂时无法在飞书文档外展示此内容
2. 接口变更记录
暂时无法在飞书文档外展示此内容

---
注意事项：
1. 所有时间参数都使用ISO 8601格式
2. 分页查询的page从1开始计数
3. 文件上传限制：单个文件最大10MB，支持pdf、doc、docx、xls、xlsx格式
4. 接口调用频率限制：单用户每秒最多100次请求
5. 统计接口数据每日凌晨更新，查询当日数据可能存在延迟