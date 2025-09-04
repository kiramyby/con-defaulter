const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '违约客户管理系统 API',
      version: '1.0.0',
      description: '违约客户管理系统的RESTful API接口文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: '开发环境',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        DefaultReason: {
          type: 'object',
          properties: {
            id: { type: 'number', description: '违约原因ID' },
            reason: { type: 'string', description: '违约原因名称' },
            detail: { type: 'string', description: '详细描述' },
            enabled: { type: 'boolean', description: '是否启用' },
            sortOrder: { type: 'number', description: '排序顺序' },
            createTime: { type: 'string', format: 'date-time', description: '创建时间' },
            updateTime: { type: 'string', format: 'date-time', description: '更新时间' },
          },
        },
        DefaultApplication: {
          type: 'object',
          properties: {
            applicationId: { type: 'string', description: '申请ID' },
            customerId: { type: 'number', description: '客户ID' },
            customerName: { type: 'string', description: '客户名称' },
            applicant: { type: 'string', description: '申请人' },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
              description: '申请状态',
            },
            severity: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
              description: '严重程度',
            },
            defaultReasons: {
              type: 'array',
              items: { type: 'number' },
              description: '违约原因ID列表',
            },
            createTime: { type: 'string', format: 'date-time', description: '创建时间' },
            latestExternalRating: { type: 'string', description: '最新外部评级' },
          },
        },
        DefaultCustomer: {
          type: 'object',
          properties: {
            customerId: { type: 'number', description: '客户ID' },
            customerName: { type: 'string', description: '客户名称' },
            status: { type: 'string', description: '客户状态' },
            defaultReasons: {
              type: 'array',
              items: { type: 'number' },
              description: '违约原因ID列表',
            },
            severity: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
              description: '严重程度',
            },
            applicant: { type: 'string', description: '申请人' },
            applicationTime: { type: 'string', format: 'date-time', description: '申请时间' },
            approveTime: { type: 'string', format: 'date-time', description: '审核时间' },
            latestExternalRating: { type: 'string', description: '最新外部评级' },
          },
        },
        RenewalReason: {
          type: 'object',
          properties: {
            id: { type: 'number', description: '重生原因ID' },
            reason: { type: 'string', description: '重生原因名称' },
            enabled: { type: 'boolean', description: '是否启用' },
          },
        },
        Renewal: {
          type: 'object',
          properties: {
            renewalId: { type: 'string', description: '重生申请ID' },
            customerId: { type: 'number', description: '客户ID' },
            customerName: { type: 'string', description: '客户名称' },
            renewalReason: {
              type: 'object',
              properties: {
                id: { type: 'number', description: '重生原因ID' },
                reason: { type: 'string', description: '重生原因名称' },
              },
            },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
              description: '申请状态',
            },
            remark: { type: 'string', description: '申请备注' },
            applicant: { type: 'string', description: '申请人' },
            createTime: { type: 'string', format: 'date-time', description: '创建时间' },
            approver: { type: 'string', description: '审核人' },
            approveTime: { type: 'string', format: 'date-time', description: '审核时间' },
            approveRemark: { type: 'string', description: '审核备注' },
          },
        },
        RenewalDetail: {
          type: 'object',
          properties: {
            renewalId: { type: 'string', description: '重生申请ID' },
            customerId: { type: 'number', description: '客户ID' },
            customerName: { type: 'string', description: '客户名称' },
            customerInfo: {
              type: 'object',
              properties: {
                industry: { type: 'string', description: '行业' },
                region: { type: 'string', description: '地区' },
                latestExternalRating: { type: 'string', description: '最新外部评级' },
              },
            },
            renewalReason: {
              type: 'object',
              properties: {
                id: { type: 'number', description: '重生原因ID' },
                reason: { type: 'string', description: '重生原因名称' },
              },
            },
            originalDefaultReasons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', description: '违约原因ID' },
                  reason: { type: 'string', description: '违约原因名称' },
                },
              },
              description: '原违约原因列表',
            },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
              description: '申请状态',
            },
            remark: { type: 'string', description: '申请备注' },
            applicant: { type: 'string', description: '申请人' },
            createTime: { type: 'string', format: 'date-time', description: '创建时间' },
            approver: { type: 'string', description: '审核人' },
            approveTime: { type: 'string', format: 'date-time', description: '审核时间' },
            approveRemark: { type: 'string', description: '审核备注' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'number', description: '用户ID' },
            username: { type: 'string', description: '用户名' },
            realName: { type: 'string', description: '真实姓名' },
            email: { type: 'string', format: 'email', description: '邮箱地址' },
            phone: { type: 'string', description: '手机号码' },
            role: { 
              type: 'string', 
              enum: ['ADMIN', 'OPERATOR', 'AUDITOR'],
              description: '用户角色',
            },
            status: { 
              type: 'string', 
              enum: ['ACTIVE', 'INACTIVE'],
              description: '用户状态',
            },
            department: { type: 'string', description: '部门' },
            createTime: { type: 'string', format: 'date-time', description: '创建时间' },
            updateTime: { type: 'string', format: 'date-time', description: '更新时间' },
            lastLoginTime: { type: 'string', format: 'date-time', description: '最后登录时间' },
            createdBy: { type: 'string', description: '创建人' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'number', description: '错误代码' },
            message: { type: 'string', description: '错误信息' },
            timestamp: { type: 'string', format: 'date-time', description: '时间戳' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            total: { type: 'number', description: '总记录数' },
            page: { type: 'number', description: '当前页码' },
            size: { type: 'number', description: '每页大小' },
            list: {
              type: 'array',
              items: {},
              description: '数据列表',
            },
          },
        },
      },
    },
    tags: [
      {
        name: '系统',
        description: '系统相关接口',
      },
      {
        name: '认证管理',
        description: '用户登录、登出、令牌管理等认证相关接口',
      },
      {
        name: '用户管理',
        description: '系统用户的查询和管理',
      },
      {
        name: '违约原因管理',
        description: '违约原因的CRUD操作',
      },
      {
        name: '违约认定申请',
        description: '违约认定申请的管理',
      },
      {
        name: '违约客户查询',
        description: '违约客户的查询和导出',
      },
      {
        name: '违约重生管理',
        description: '违约客户重生申请管理',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

try {
  const specs = swaggerJsdoc(options);
  fs.writeFileSync('./api.json', JSON.stringify(specs, null, 2), 'utf8');
  
  console.log('✅ API文档生成成功: api.json');
  console.log(`📊 总端点数: ${Object.keys(specs.paths || {}).length}`);
  
  // 统计各个模块的端点数量
  const paths = specs.paths || {};
  const endpoints = Object.keys(paths);
  
  const categories = {
    '认证管理': endpoints.filter(p => p.startsWith('/auth')).length,
    '用户管理': endpoints.filter(p => p.startsWith('/users')).length,  
    '违约原因管理': endpoints.filter(p => p.startsWith('/default-reasons')).length,
    '违约申请管理': endpoints.filter(p => p.startsWith('/default-applications')).length,
    '违约客户查询': endpoints.filter(p => p.startsWith('/default-customers')).length,
    '重生管理': endpoints.filter(p => p.startsWith('/renewal')).length,
    '系统': endpoints.filter(p => p.startsWith('/health')).length,
  };
  
  console.log('📋 各模块端点分布:');
  Object.entries(categories).forEach(([name, count]) => {
    if (count > 0) console.log(`  - ${name}: ${count}个端点`);
  });
  
} catch (error) {
  console.error('❌ 生成API文档失败:', error.message);
  process.exit(1);
}