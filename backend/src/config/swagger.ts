import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
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
            reasonCode: { type: 'string', description: '原因代码' },
            reasonName: { type: 'string', description: '原因名称' },
            description: { type: 'string', description: '详细描述' },
            isEnabled: { type: 'boolean', description: '是否启用' },
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
              description: '申请状态' 
            },
            severity: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
              description: '严重程度'
            },
            defaultReasons: {
              type: 'array',
              items: { type: 'number' },
              description: '违约原因ID列表'
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
              description: '违约原因ID列表'
            },
            severity: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW'],
              description: '严重程度'
            },
            applicant: { type: 'string', description: '申请人' },
            applicationTime: { type: 'string', format: 'date-time', description: '申请时间' },
            approveTime: { type: 'string', format: 'date-time', description: '审核时间' },
            latestExternalRating: { type: 'string', description: '最新外部评级' },
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
              description: '数据列表'
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
  apis: ['./src/routes/*.ts'], // 扫描路由文件中的注释
};

export const specs = swaggerJsdoc(options);