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
    page: z.preprocess((val) => val ? Number(val) : 1, z.number().int().min(1)).default(1),
    size: z.preprocess((val) => val ? Number(val) : 10, z.number().int().min(1).max(100)).default(10),
    reasonName: z.string().optional(),
    enabled: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : undefined, z.boolean().optional()),
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
    page: z.preprocess((val) => val ? Number(val) : 1, z.number().int().min(1)).default(1),
    size: z.preprocess((val) => val ? Number(val) : 10, z.number().int().min(1).max(100)).default(10),
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
    customerId: z.number().int().positive('客户ID必须为正整数'),
    renewalReason: z.number().int().positive('重生原因ID必须为正整数'),
    remark: z.string().max(1000, '备注不能超过1000个字符').optional(),
  }),

  approve: z.object({
    approved: z.boolean({ required_error: '审核结果必须为布尔值' }),
    remark: z.string().max(1000, '审核备注不能超过1000个字符').optional(),
  }),

  batchApprove: z.object({
    renewals: z.array(z.object({
      renewalId: z.string().min(1, '重生申请ID不能为空'),
      approved: z.boolean({ required_error: '审核结果必须为布尔值' }),
      remark: z.string().max(1000, '审核备注不能超过1000个字符').optional(),
    })).min(1, '至少需要审核一个申请').max(100, '单次最多审核100个申请'),
  }),

  query: z.object({
    page: z.preprocess((val) => val ? Number(val) : 1, z.number().int().min(1)).default(1),
    size: z.preprocess((val) => val ? Number(val) : 10, z.number().int().min(1).max(100)).default(10),
    status: commonValidation.renewalStatus.optional(),
    customerName: z.string().max(255).optional(),
    applicant: z.string().max(255).optional(),
    startTime: commonValidation.dateString,
    endTime: commonValidation.dateString,
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
    role: z.enum(['ADMIN', 'AUDITOR', 'OPERATOR', 'USER'], {
      errorMap: () => ({ message: '角色必须是ADMIN、AUDITOR、OPERATOR或USER之一' })
    }),
    password: z.string().min(6, '密码至少6位')
      .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/.test(val), {
        message: '密码必须包含大小写字母和数字，至少6位',
      }),
  }),

  selfRegister: z.object({
    username: z.string().min(2, '用户名至少2位').max(50, '用户名不能超过50位')
      .refine(val => /^[a-zA-Z0-9_]+$/.test(val), {
        message: '用户名只能包含字母、数字和下划线',
      }),
    realName: z.string().min(2, '真实姓名至少2位').max(100, '真实姓名不能超过100位'),
    email: z.string().email('邮箱格式不正确'),
    phone: z.string().optional(),
    department: z.string().optional(),
    password: z.string().min(6, '密码至少6位')
      .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/.test(val), {
        message: '密码必须包含大小写字母和数字，至少6位',
      }),
  }),
};

// 用户管理验证
export const userManagementValidation = {
  getAllUsers: z.object({
    page: z.preprocess((val) => val ? Number(val) : 1, z.number().int().min(1)).default(1),
    size: z.preprocess((val) => val ? Number(val) : 10, z.number().int().min(1).max(100)).default(10),
    role: z.enum(['ADMIN', 'OPERATOR', 'AUDITOR']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    keyword: z.string().max(255).optional(),
  }),

  updateUserStatus: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: '用户状态必须是ACTIVE或INACTIVE' })
    }),
  }),

  getUserById: z.object({
    userId: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: '用户ID必须是正整数',
    }),
  }),

  updateUser: z.object({
    username: z.string().min(2, '用户名至少2位').max(50, '用户名不能超过50位')
      .refine(val => /^[a-zA-Z0-9_]+$/.test(val), {
        message: '用户名只能包含字母、数字和下划线',
      }).optional(),
    email: z.string().email('邮箱格式不正确').optional(),
    realName: z.string().min(2, '真实姓名至少2位').max(100, '真实姓名不能超过100位').optional(),
    phone: z.string().max(20, '手机号码不能超过20位').optional(),
    role: z.enum(['ADMIN', 'AUDITOR', 'OPERATOR', 'USER'], {
      errorMap: () => ({ message: '角色必须是ADMIN、AUDITOR、OPERATOR或USER之一' })
    }).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: '用户状态必须是ACTIVE或INACTIVE' })
    }).optional(),
    department: z.string().max(100, '部门不能超过100位').optional(),
  }),

  resetPassword: z.object({
    newPassword: z.string().min(6, '新密码至少6位')
      .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/.test(val), {
        message: '新密码必须包含大小写字母和数字，至少6位',
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
      ['page', 'size', 'year', 'startYear', 'endYear', 'customerId', 'renewalReason', 'renewalReasonId', 'userId'].forEach(key => {
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