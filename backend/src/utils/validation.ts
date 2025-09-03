import { z } from 'zod';

// 通用验证规则
export const commonValidation = {
  id: z.number().int().positive(),
  bigintId: z.union([z.string(), z.number()]).transform(val => BigInt(val)),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    size: z.number().int().min(1).max(100).default(10),
  }),
  dateString: z.string().datetime().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  applicationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  renewalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  customerStatus: z.enum(['NORMAL', 'DEFAULT', 'RENEWAL']),
};

// 违约原因验证
export const defaultReasonValidation = {
  create: z.object({
    reason: z.string().min(1).max(255),
    detail: z.string().min(1),
    enabled: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }),

  update: z.object({
    reason: z.string().min(1).max(255),
    detail: z.string().min(1),
    enabled: z.boolean(),
    sortOrder: z.number().int(),
  }),

  query: z.object({
    page: z.number().int().min(1).default(1),
    size: z.number().int().min(1).max(100).default(10),
    reasonName: z.string().optional(),
    enabled: z.boolean().optional(),
  }),
};

// 违约申请验证
export const defaultApplicationValidation = {
  create: z.object({
    customerName: z.string().min(1).max(255),
    latestExternalRating: z.string().max(10).optional(),
    defaultReasons: z.array(z.number().int().positive()).min(1),
    severity: commonValidation.severity,
    remark: z.string().optional(),
    attachments: z.array(z.object({
      fileName: z.string().min(1),
      fileUrl: z.string().url(),
      fileSize: z.number().int().positive(),
    })).optional(),
  }),

  approve: z.object({
    approved: z.boolean(),
    remark: z.string().optional(),
  }),

  batchApprove: z.object({
    applications: z.array(z.object({
      applicationId: z.string().min(1),
      approved: z.boolean(),
      remark: z.string().optional(),
    })).min(1),
  }),

  query: z.object({
    page: z.number().int().min(1).default(1),
    size: z.number().int().min(1).max(100).default(10),
    status: commonValidation.applicationStatus.optional(),
    customerName: z.string().optional(),
    applicant: z.string().optional(),
    startTime: commonValidation.dateString,
    endTime: commonValidation.dateString,
    severity: commonValidation.severity.optional(),
  }),
};

// 重生申请验证
export const renewalValidation = {
  create: z.object({
    customerId: z.number().int().positive(),
    renewalReason: z.number().int().positive(),
    remark: z.string().optional(),
  }),

  approve: z.object({
    approved: z.boolean(),
    remark: z.string().optional(),
  }),

  query: z.object({
    page: z.number().int().min(1).default(1),
    size: z.number().int().min(1).max(100).default(10),
    customerName: z.string().optional(),
  }),
};

// 统计验证
export const statisticsValidation = {
  byIndustry: z.object({
    year: z.number().int().min(2000).max(3000).optional(),
    type: z.enum(['DEFAULT', 'RENEWAL']).optional(),
  }),

  byRegion: z.object({
    year: z.number().int().min(2000).max(3000).optional(),
    type: z.enum(['DEFAULT', 'RENEWAL']).optional(),
  }),

  trend: z.object({
    dimension: z.enum(['INDUSTRY', 'REGION']),
    target: z.string().min(1),
    startYear: z.number().int().min(2000).max(3000).optional(),
    endYear: z.number().int().min(2000).max(3000).optional(),
  }),
};

// 认证验证
export const authValidation = {
  login: z.object({
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(6, '密码至少6位'),
  }),

  refreshToken: z.object({
    refresh_token: z.string().min(1, '刷新令牌不能为空'),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(6, '当前密码至少6位'),
    newPassword: z.string().min(6, '新密码至少6位')
      .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/.test(val), {
        message: '新密码必须包含大小写字母和数字，至少6位',
      }),
  }),

  register: z.object({
    username: z.string().min(2, '用户名至少2位').max(50, '用户名不能超过50位')
      .refine(val => /^[a-zA-Z0-9_]+$/.test(val), {
        message: '用户名只能包含字母、数字和下划线',
      }),
    realName: z.string().min(2, '真实姓名至少2位').max(100, '真实姓名不能超过100位'),
    email: z.string().email('邮箱格式不正确'),
    phone: z.string().optional(),
    department: z.string().optional(),
    role: z.enum(['ADMIN', 'OPERATOR', 'AUDITOR'], {
      errorMap: () => ({ message: '角色必须是ADMIN、OPERATOR或AUDITOR之一' })
    }),
    password: z.string().min(6, '密码至少6位')
      .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/.test(val), {
        message: '密码必须包含大小写字母和数字，至少6位',
      }),
  }),
};

// 文件上传验证
export const fileValidation = {
  upload: z.object({
    originalname: z.string(),
    mimetype: z.string().refine(
      (type) => ['application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(type),
      { message: '只支持 PDF, DOC, DOCX, XLS, XLSX 格式文件' },
    ),
    size: z.number().max(10 * 1024 * 1024, '文件大小不能超过10MB'),
  }),
};

/**
 * 验证中间件生成器
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 400,
          message: '参数验证失败',
          data: error.errors,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
};

/**
 * 查询参数验证中间件生成器
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      // 转换查询参数类型
      const query = { ...req.query };
      
      // 数字类型转换
      ['page', 'size', 'year', 'startYear', 'endYear', 'customerId', 'renewalReason'].forEach(key => {
        if (query[key] && !isNaN(Number(query[key]))) {
          query[key] = Number(query[key]);
        }
      });
      
      // 布尔类型转换
      ['enabled'].forEach(key => {
        if (query[key] !== undefined) {
          query[key] = query[key] === 'true';
        }
      });

      const validatedData = schema.parse(query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 400,
          message: '查询参数验证失败',
          data: error.errors,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
};