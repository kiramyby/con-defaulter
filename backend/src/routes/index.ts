import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

// Controllers
import { AuthController } from '../controllers/AuthController';
import { DefaultReasonController } from '../controllers/DefaultReasonController';
import { DefaultApplicationController } from '../controllers/DefaultApplicationController';
import { DefaultCustomerController } from '../controllers/DefaultCustomerController';
import { RenewalController } from '../controllers/RenewalController';

// Services
import { DefaultReasonService } from '../services/DefaultReasonService';
import { DefaultApplicationService } from '../services/DefaultApplicationService';
import { DefaultCustomerService } from '../services/DefaultCustomerService';
import { RenewalService } from '../services/RenewalService';

// Validation
import { 
  validate, 
  validateQuery, 
  authValidation,
  defaultReasonValidation, 
  defaultApplicationValidation,
  renewalValidation, 
} from '../utils/validation';

// Middleware
import { authenticateToken, requireRole, requireDataAccess } from '../middleware/auth';

const router = Router();

// 初始化服务和控制器
const initializeRoutes = (prisma: PrismaClient) => {
  // 初始化服务
  const defaultReasonService = new DefaultReasonService(prisma);
  const defaultApplicationService = new DefaultApplicationService(prisma);
  const defaultCustomerService = new DefaultCustomerService(prisma);
  const renewalService = new RenewalService(prisma);

  // 初始化控制器
  const authController = new AuthController(prisma);
  const defaultReasonController = new DefaultReasonController(defaultReasonService);
  const defaultApplicationController = new DefaultApplicationController(defaultApplicationService);
  const defaultCustomerController = new DefaultCustomerController(defaultCustomerService);
  const renewalController = new RenewalController(renewalService);

  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [系统]
   *     summary: 健康检查
   *     description: 检查API服务是否正常运行
   *     responses:
   *       200:
   *         description: 服务正常
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ==================== 认证路由 ====================
  
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [认证管理]
   *     summary: 用户登录
   *     description: 用户邮箱密码登录，获取JWT令牌
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 用户邮箱
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 description: 用户密码
   *     responses:
   *       200:
   *         description: 登录成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 access_token:
   *                   type: string
   *                   description: 访问令牌
   *                 refresh_token:
   *                   type: string
   *                   description: 刷新令牌
   *                 expires_in:
   *                   type: number
   *                   description: 令牌过期时间（秒）
   *                 token_type:
   *                   type: string
   *                   example: bearer
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     dbId:
   *                       type: number
   *                     username:
   *                       type: string
   *                     realName:
   *                       type: string
   *                     role:
   *                       type: string
   *                       enum: [ADMIN, OPERATOR, AUDITOR]
   *                     status:
   *                       type: string
   *                       enum: [ACTIVE, INACTIVE]
   *                     department:
   *                       type: string
   *       400:
   *         description: 参数错误
   *       401:
   *         description: 邮箱或密码错误
   *       403:
   *         description: 用户已被禁用
   */
  router.post('/auth/login',
    validate(authValidation.login),
    authController.login,
  );
  
  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [认证管理]
   *     summary: 用户登出
   *     description: 用户登出，使令牌失效
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: 登出成功
   */
  router.post('/auth/logout',
    authController.logout,
  );

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [认证管理]
   *     summary: 刷新访问令牌
   *     description: 使用刷新令牌获取新的访问令牌
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refresh_token
   *             properties:
   *               refresh_token:
   *                 type: string
   *                 description: 刷新令牌
   *     responses:
   *       200:
   *         description: 刷新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 access_token:
   *                   type: string
   *                 refresh_token:
   *                   type: string
   *                 expires_in:
   *                   type: number
   *                 token_type:
   *                   type: string
   *       401:
   *         description: 刷新令牌无效或已过期
   */
  router.post('/auth/refresh',
    validate(authValidation.refreshToken),
    authController.refreshToken,
  );

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     tags: [认证管理]
   *     summary: 获取当前用户信息
   *     description: 获取当前登录用户的详细信息
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                 email:
   *                   type: string
   *                 dbId:
   *                   type: number
   *                 username:
   *                   type: string
   *                 realName:
   *                   type: string
   *                 role:
   *                   type: string
   *                   enum: [ADMIN, OPERATOR, AUDITOR]
   *                 status:
   *                   type: string
   *                 department:
   *                   type: string
   *       401:
   *         description: 未登录
   */
  router.get('/auth/profile',
    authenticateToken,
    authController.getProfile,
  );


  /**
   * @swagger
   * /auth/register:
   *   post:
   *     tags: [认证管理]
   *     summary: 用户注册
   *     description: 创建新用户账号，只有ADMIN可以创建
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - realName
   *               - email
   *               - role
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 description: 用户名（字母数字下划线）
   *               realName:
   *                 type: string
   *                 description: 真实姓名
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 邮箱地址
   *               phone:
   *                 type: string
   *                 description: 手机号码
   *               department:
   *                 type: string
   *                 description: 部门
   *               role:
   *                 type: string
   *                 enum: [ADMIN, OPERATOR, AUDITOR]
   *                 description: 用户角色
   *               password:
   *                 type: string
   *                 description: 密码（必须包含大小写字母和数字）
   *     responses:
   *       201:
   *         description: 用户创建成功
   *       400:
   *         description: 参数错误或用户已存在
   *       401:
   *         description: 未登录
   *       403:
   *         description: 权限不足
   */
  router.post('/auth/register',
    authenticateToken,
    requireRole(['ADMIN']),
    validate(authValidation.register),
    authController.register,
  );

  // ==================== 违约原因管理路由 ====================
  
  /**
   * @swagger
   * /default-reasons:
   *   get:
   *     tags: [违约原因管理]
   *     summary: 查询违约原因列表
   *     description: 获取违约原因的分页列表，支持条件查询
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: 每页大小
   *       - in: query
   *         name: reasonName
   *         schema:
   *           type: string
   *         description: 原因名称（模糊查询）
   *       - in: query
   *         name: isEnabled
   *         schema:
   *           type: boolean
   *         description: 是否启用
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     list:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/DefaultReason'
   */
  router.get('/default-reasons', 
    validateQuery(defaultReasonValidation.query),
    defaultReasonController.getReasons,
  );
  
  /**
   * @swagger
   * /default-reasons/enabled:
   *   get:
   *     tags: [违约原因管理]
   *     summary: 查询启用的违约原因列表
   *     description: 获取所有启用状态的违约原因，用于申请时选择
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/DefaultReason'
   */
  router.get('/default-reasons/enabled', 
    defaultReasonController.getEnabledReasons,
  );
  
  /**
   * @swagger
   * /default-reasons/{id}:
   *   get:
   *     tags: [违约原因管理]
   *     summary: 获取违约原因详情
   *     description: 根据ID获取违约原因的详细信息
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 违约原因ID
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DefaultReason'
   *       400:
   *         description: 无效的ID
   *       404:
   *         description: 违约原因不存在
   */
  router.get('/default-reasons/:id', 
    defaultReasonController.getReasonById,
  );
  
  /**
   * @swagger
   * /default-reasons:
   *   post:
   *     tags: [违约原因管理]
   *     summary: 创建违约原因
   *     description: 创建新的违约原因，需要ADMIN或OPERATOR权限
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *               - detail
   *             properties:
   *               reason:
   *                 type: string
   *                 maxLength: 255
   *                 description: 违约原因名称
   *               detail:
   *                 type: string
   *                 description: 详细描述
   *               enabled:
   *                 type: boolean
   *                 default: true
   *                 description: 是否启用
   *               sortOrder:
   *                 type: integer
   *                 default: 0
   *                 description: 排序顺序
   *     responses:
   *       201:
   *         description: 创建成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DefaultReason'
   *       400:
   *         description: 参数验证失败
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.post('/default-reasons',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']),
    validate(defaultReasonValidation.create),
    defaultReasonController.createReason,
  );
  
  router.put('/default-reasons/:id',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']),
    validate(defaultReasonValidation.update),
    defaultReasonController.updateReason,
  );
  
  router.delete('/default-reasons/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    defaultReasonController.deleteReason,
  );
  
  router.post('/default-reasons/batch-status',
    authenticateToken,
    requireRole(['ADMIN']),
    defaultReasonController.batchUpdateStatus,
  );

  // ==================== 违约认定申请路由 ====================
  
  /**
   * @swagger
   * /default-applications:
   *   post:
   *     tags: [违约认定申请]
   *     summary: 提交违约认定申请
   *     description: 创建新的违约认定申请（需要ADMIN或OPERATOR角色）
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - customerName
   *               - defaultReasons
   *               - severity
   *             properties:
   *               customerName:
   *                 type: string
   *                 description: 客户名称
   *               latestExternalRating:
   *                 type: string
   *                 description: 最新外部评级
   *               defaultReasons:
   *                 type: array
   *                 items:
   *                   type: number
   *                 description: 违约原因ID列表
   *               severity:
   *                 type: string
   *                 enum: [HIGH, MEDIUM, LOW]
   *                 description: 严重程度
   *               remark:
   *                 type: string
   *                 description: 备注
   *               attachments:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     fileName:
   *                       type: string
   *                     fileUrl:
   *                       type: string
   *                     fileSize:
   *                       type: number
   *                 description: 附件列表
   *     responses:
   *       201:
   *         description: 申请创建成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DefaultApplication'
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.post('/default-applications',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']), // 只有管理员和操作员可以提交申请
    validate(defaultApplicationValidation.create),
    defaultApplicationController.createApplication,
  );
  
  /**
   * @swagger
   * /default-applications:
   *   get:
   *     tags: [违约认定申请]
   *     summary: 查询违约认定申请列表
   *     description: 获取违约认定申请的分页列表，支持条件查询。OPERATOR只能查看自己提交的申请。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: 每页大小
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, REJECTED]
   *         description: 申请状态
   *       - in: query
   *         name: customerName
   *         schema:
   *           type: string
   *         description: 客户名称（模糊查询）
   *       - in: query
   *         name: applicant
   *         schema:
   *           type: string
   *         description: 申请人
   *       - in: query
   *         name: severity
   *         schema:
   *           type: string
   *           enum: [HIGH, MEDIUM, LOW]
   *         description: 严重程度
   *       - in: query
   *         name: startTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 开始时间
   *       - in: query
   *         name: endTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 结束时间
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     list:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/DefaultApplication'
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.get('/default-applications',
    authenticateToken,
    requireDataAccess(true), // 需要检查数据访问权限
    validateQuery(defaultApplicationValidation.query),
    defaultApplicationController.getApplications,
  );
  
  /**
   * @swagger
   * /default-applications/{applicationId}:
   *   get:
   *     tags: [违约认定申请]
   *     summary: 获取违约认定申请详情
   *     description: 根据申请ID获取详细信息。OPERATOR只能查看自己提交的申请。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: applicationId
   *         required: true
   *         schema:
   *           type: string
   *         description: 申请ID
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 applicationId:
   *                   type: string
   *                 customerId:
   *                   type: number
   *                 customerName:
   *                   type: string
   *                 latestExternalRating:
   *                   type: string
   *                 defaultReasons:
   *                   type: array
   *                   items:
   *                     type: number
   *                 severity:
   *                   type: string
   *                   enum: [HIGH, MEDIUM, LOW]
   *                 remark:
   *                   type: string
   *                 attachments:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       fileName:
   *                         type: string
   *                       fileUrl:
   *                         type: string
   *                       fileSize:
   *                         type: number
   *                 applicant:
   *                   type: string
   *                 status:
   *                   type: string
   *                   enum: [PENDING, APPROVED, REJECTED]
   *                 createTime:
   *                   type: string
   *                   format: date-time
   *                 approveTime:
   *                   type: string
   *                   format: date-time
   *                 approver:
   *                   type: string
   *                 approveRemark:
   *                   type: string
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       404:
   *         description: 申请不存在或无权限访问
   */
  router.get('/default-applications/:applicationId',
    authenticateToken,
    requireDataAccess(true), // 需要检查数据访问权限
    defaultApplicationController.getApplicationDetail,
  );
  
  /**
   * @swagger
   * /default-applications/{applicationId}/approve:
   *   post:
   *     tags: [违约认定申请]
   *     summary: 审核违约认定申请
   *     description: 审核单个违约认定申请，只有ADMIN和AUDITOR可以审核
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: applicationId
   *         required: true
   *         schema:
   *           type: string
   *         description: 申请ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - approved
   *             properties:
   *               approved:
   *                 type: boolean
   *                 description: 是否审核通过
   *               remark:
   *                 type: string
   *                 description: 审核备注
   *     responses:
   *       200:
   *         description: 审核成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 applicationId:
   *                   type: string
   *                 status:
   *                   type: string
   *                   enum: [APPROVED, REJECTED]
   *                 approver:
   *                   type: string
   *                 approveTime:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       404:
   *         description: 申请不存在
   */
  router.post('/default-applications/:applicationId/approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(defaultApplicationValidation.approve),
    defaultApplicationController.approveApplication,
  );
  
  /**
   * @swagger
   * /default-applications/batch-approve:
   *   post:
   *     tags: [违约认定申请]
   *     summary: 批量审核违约认定申请
   *     description: 批量审核多个违约认定申请，只有ADMIN和AUDITOR可以审核
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - applications
   *             properties:
   *               applications:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   type: object
   *                   required:
   *                     - applicationId
   *                     - approved
   *                   properties:
   *                     applicationId:
   *                       type: string
   *                       description: 申请ID
   *                     approved:
   *                       type: boolean
   *                       description: 是否审核通过
   *                     remark:
   *                       type: string
   *                       description: 审核备注
   *     responses:
   *       200:
   *         description: 批量审核完成
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 successCount:
   *                   type: number
   *                   description: 成功处理数量
   *                 failCount:
   *                   type: number
   *                   description: 失败处理数量
   *                 details:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       applicationId:
   *                         type: string
   *                       success:
   *                         type: boolean
   *                       message:
   *                         type: string
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.post('/default-applications/batch-approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(defaultApplicationValidation.batchApprove),
    defaultApplicationController.batchApprove,
  );

  // ==================== 违约客户查询路由 ====================
  
  /**
   * @swagger
   * /default-customers:
   *   get:
   *     tags: [违约客户查询]
   *     summary: 查询违约客户列表
   *     description: 获取违约客户的分页列表，支持条件查询。OPERATOR只能查看自己申请的违约客户。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: 每页大小
   *       - in: query
   *         name: customerName
   *         schema:
   *           type: string
   *         description: 客户名称（模糊查询）
   *       - in: query
   *         name: severity
   *         schema:
   *           type: string
   *           enum: [HIGH, MEDIUM, LOW]
   *         description: 严重程度
   *       - in: query
   *         name: startTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 开始时间（按申请时间筛选）
   *       - in: query
   *         name: endTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 结束时间（按申请时间筛选）
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     list:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/DefaultCustomer'
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.get('/default-customers',
    authenticateToken,
    requireDataAccess(false), // 所有角色都可查看，但可能有数据范围限制
    defaultCustomerController.getDefaultCustomers,
  );
  
  /**
   * @swagger
   * /default-customers/export:
   *   get:
   *     tags: [违约客户查询]
   *     summary: 导出违约客户列表
   *     description: 导出违约客户数据为Excel文件。OPERATOR只能导出自己申请的违约客户。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: customerName
   *         schema:
   *           type: string
   *         description: 客户名称（模糊查询）
   *       - in: query
   *         name: severity
   *         schema:
   *           type: string
   *           enum: [HIGH, MEDIUM, LOW]
   *         description: 严重程度
   *       - in: query
   *         name: startTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 开始时间（按申请时间筛选）
   *       - in: query
   *         name: endTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 结束时间（按申请时间筛选）
   *     responses:
   *       200:
   *         description: 导出成功
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema:
   *               type: string
   *               format: binary
   *         headers:
   *           Content-Disposition:
   *             description: 附件文件名
   *             schema:
   *               type: string
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.get('/default-customers/export',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR', 'OPERATOR']), // 所有角色都可导出
    requireDataAccess(false), // 但数据范围根据权限控制
    defaultCustomerController.exportDefaultCustomers,
  );
  
  /**
   * @swagger
   * /default-customers/renewable:
   *   get:
   *     tags: [违约客户查询]
   *     summary: 查询可续期客户列表
   *     description: 获取可以申请重生的违约客户列表，只有ADMIN和OPERATOR可以查看
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: 每页大小
   *       - in: query
   *         name: customerName
   *         schema:
   *           type: string
   *         description: 客户名称（模糊查询）
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     list:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/DefaultCustomer'
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.get('/default-customers/renewable',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']), // 只有管理员和操作员可以查看可续期客户
    defaultCustomerController.getRenewableCustomers,
  );
  
  /**
   * @swagger
   * /default-customers/{customerId}:
   *   get:
   *     tags: [违约客户查询]
   *     summary: 获取违约客户详情
   *     description: 根据客户ID获取违约客户的详细信息。OPERATOR只能查看自己申请的违约客户。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: customerId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 客户ID
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DefaultCustomer'
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       404:
   *         description: 违约客户不存在或无权限访问
   */
  router.get('/default-customers/:customerId',
    authenticateToken,
    requireDataAccess(true), // 需要检查是否有权限查看特定客户
    defaultCustomerController.getDefaultCustomerByCustomerId,
  );

  // ==================== 违约重生管理路由 ====================
  
  /**
   * @swagger
   * /renewal-reasons:
   *   get:
   *     tags: [违约重生管理]
   *     summary: 获取重生原因列表
   *     description: 获取所有启用的违约重生原因，用于创建重生申请时选择
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: number
   *                     description: 重生原因ID
   *                   reason:
   *                     type: string
   *                     description: 重生原因名称
   *                   enabled:
   *                     type: boolean
   *                     description: 是否启用
   */
  router.get('/renewal-reasons',
    renewalController.getRenewalReasons,
  );
  
  /**
   * @swagger
   * /renewals:
   *   post:
   *     tags: [违约重生管理]
   *     summary: 提交违约重生申请
   *     description: 为违约客户提交重生申请，需要ADMIN或OPERATOR权限
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - customerId
   *               - renewalReason
   *             properties:
   *               customerId:
   *                 type: number
   *                 description: 违约客户ID
   *               renewalReason:
   *                 type: number
   *                 description: 重生原因ID
   *               remark:
   *                 type: string
   *                 maxLength: 1000
   *                 description: 申请备注
   *     responses:
   *       201:
   *         description: 申请创建成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 renewalId:
   *                   type: string
   *                 customerId:
   *                   type: number
   *                 customerName:
   *                   type: string
   *                 status:
   *                   type: string
   *                   enum: [PENDING]
   *                 createTime:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误或客户状态不符合要求
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.post('/renewals',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']),
    validate(renewalValidation.create),
    renewalController.createRenewal,
  );
  
  /**
   * @swagger
   * /renewals:
   *   get:
   *     tags: [违约重生管理]
   *     summary: 查询重生申请列表
   *     description: 获取重生申请的分页列表，支持条件查询。OPERATOR只能查看自己提交的申请。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: size
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: 每页大小
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, REJECTED]
   *         description: 申请状态
   *       - in: query
   *         name: customerName
   *         schema:
   *           type: string
   *         description: 客户名称（模糊查询）
   *       - in: query
   *         name: applicant
   *         schema:
   *           type: string
   *         description: 申请人
   *       - in: query
   *         name: startTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 开始时间
   *       - in: query
   *         name: endTime
   *         schema:
   *           type: string
   *           format: date-time
   *         description: 结束时间
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/PaginatedResponse'
   *                 - type: object
   *                   properties:
   *                     list:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           renewalId:
   *                             type: string
   *                           customerId:
   *                             type: number
   *                           customerName:
   *                             type: string
   *                           renewalReason:
   *                             type: object
   *                             properties:
   *                               id:
   *                                 type: number
   *                               reason:
   *                                 type: string
   *                           status:
   *                             type: string
   *                             enum: [PENDING, APPROVED, REJECTED]
   *                           remark:
   *                             type: string
   *                           applicant:
   *                             type: string
   *                           createTime:
   *                             type: string
   *                             format: date-time
   *                           approver:
   *                             type: string
   *                           approveTime:
   *                             type: string
   *                             format: date-time
   *                           approveRemark:
   *                             type: string
   *       401:
   *         description: 未授权
   */
  router.get('/renewals',
    authenticateToken,
    validateQuery(renewalValidation.query),
    renewalController.getRenewals,
  );
  
  /**
   * @swagger
   * /renewals/{renewalId}:
   *   get:
   *     tags: [违约重生管理]
   *     summary: 获取重生申请详情
   *     description: 根据申请ID获取详细信息。OPERATOR只能查看自己提交的申请。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: renewalId
   *         required: true
   *         schema:
   *           type: string
   *         description: 重生申请ID
   *     responses:
   *       200:
   *         description: 查询成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 renewalId:
   *                   type: string
   *                 customerId:
   *                   type: number
   *                 customerName:
   *                   type: string
   *                 customerInfo:
   *                   type: object
   *                   properties:
   *                     industry:
   *                       type: string
   *                     region:
   *                       type: string
   *                     latestExternalRating:
   *                       type: string
   *                 renewalReason:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: number
   *                     reason:
   *                       type: string
   *                 originalDefaultReasons:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                       reason:
   *                         type: string
   *                 status:
   *                   type: string
   *                   enum: [PENDING, APPROVED, REJECTED]
   *                 remark:
   *                   type: string
   *                 applicant:
   *                   type: string
   *                 createTime:
   *                   type: string
   *                   format: date-time
   *                 approver:
   *                   type: string
   *                 approveTime:
   *                   type: string
   *                   format: date-time
   *                 approveRemark:
   *                   type: string
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       404:
   *         description: 申请不存在
   */
  router.get('/renewals/:renewalId',
    authenticateToken,
    renewalController.getRenewalDetail,
  );
  
  /**
   * @swagger
   * /renewals/{renewalId}/approve:
   *   post:
   *     tags: [违约重生管理]
   *     summary: 审核重生申请
   *     description: 审核单个违约重生申请，只有ADMIN和AUDITOR可以审核
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: renewalId
   *         required: true
   *         schema:
   *           type: string
   *         description: 重生申请ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - approved
   *             properties:
   *               approved:
   *                 type: boolean
   *                 description: 是否审核通过
   *               remark:
   *                 type: string
   *                 maxLength: 1000
   *                 description: 审核备注
   *     responses:
   *       200:
   *         description: 审核成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 renewalId:
   *                   type: string
   *                 status:
   *                   type: string
   *                   enum: [APPROVED, REJECTED]
   *                 approver:
   *                   type: string
   *                 approveTime:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   *       404:
   *         description: 申请不存在
   */
  router.post('/renewals/:renewalId/approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(renewalValidation.approve),
    renewalController.approveRenewal,
  );

  /**
   * @swagger
   * /renewals/batch-approve:
   *   post:
   *     tags: [违约重生管理]
   *     summary: 批量审核重生申请
   *     description: 批量审核多个违约重生申请，只有ADMIN和AUDITOR可以审核
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - renewals
   *             properties:
   *               renewals:
   *                 type: array
   *                 minItems: 1
   *                 maxItems: 100
   *                 items:
   *                   type: object
   *                   required:
   *                     - renewalId
   *                     - approved
   *                   properties:
   *                     renewalId:
   *                       type: string
   *                       description: 重生申请ID
   *                     approved:
   *                       type: boolean
   *                       description: 是否审核通过
   *                     remark:
   *                       type: string
   *                       maxLength: 1000
   *                       description: 审核备注
   *     responses:
   *       200:
   *         description: 批量审核完成
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 successCount:
   *                   type: number
   *                   description: 成功处理数量
   *                 failCount:
   *                   type: number
   *                   description: 失败处理数量
   *                 details:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       renewalId:
   *                         type: string
   *                       success:
   *                         type: boolean
   *                       message:
   *                         type: string
   *       401:
   *         description: 未授权
   *       403:
   *         description: 权限不足
   */
  router.post('/renewals/batch-approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(renewalValidation.batchApprove),
    renewalController.batchApproveRenewals,
  );

  // TODO: 文件上传路由
  // router.post('/files/upload', upload.single('file'), fileController.uploadFile);

  // TODO: 统计分析路由
  // router.get('/statistics/by-industry', statisticsController.getIndustryStats);
  // router.get('/statistics/by-region', statisticsController.getRegionStats);
  // router.get('/statistics/trend', statisticsController.getTrendData);

  return router;
};

export { initializeRoutes };
export default router;