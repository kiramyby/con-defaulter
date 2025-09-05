import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

// Controllers
import { AuthController } from '../controllers/AuthController';
import { DefaultReasonController } from '../controllers/DefaultReasonController';
import { DefaultApplicationController } from '../controllers/DefaultApplicationController';
import { DefaultCustomerController } from '../controllers/DefaultCustomerController';
import { RenewalController } from '../controllers/RenewalController';
import { StatisticsController } from '../controllers/StatisticsController';

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
  userManagementValidation,
  statisticsValidation,
} from '../utils/validation';

// Middleware
import { authenticateToken, requireRole, requireDataAccess } from '../middleware/auth';
import { requirePermission, requireAnyPermission } from '../config/permissions';

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
  const statisticsController = new StatisticsController();

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
  router.get('/health', (_, res) => {
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "登录成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     access_token:
   *                       type: string
   *                       description: 访问令牌
   *                     refresh_token:
   *                       type: string
   *                       description: 刷新令牌
   *                     expires_in:
   *                       type: number
   *                       description: 令牌过期时间（秒）
   *                     token_type:
   *                       type: string
   *                       example: bearer
   *                     user:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         email:
   *                           type: string
   *                         dbId:
   *                           type: number
   *                         username:
   *                           type: string
   *                         realName:
   *                           type: string
   *                         role:
   *                           type: string
   *                           enum: [ADMIN, AUDITOR, OPERATOR, USER]
   *                         status:
   *                           type: string
   *                           enum: [ACTIVE, INACTIVE]
   *                         department:
   *                           type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 邮箱或密码错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 用户已被禁用
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
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
   *     description: |
   *       用户登出，撤销refresh token。使用Refresh Token轮转机制，需要在请求体中提供refresh_token。
   *       登出后该refresh token将立即失效，access token会在过期时间后自动失效。
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refresh_token:
   *                 type: string
   *                 description: 用于撤销的refresh token（可选，但建议提供以确保安全）
   *             example:
   *               refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *     responses:
   *       200:
   *         description: 登出成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "登出成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "登出成功"
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                     instruction:
   *                       type: string
   *                       example: "认证令牌已失效，请重新登录"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 认证失败，未提供有效token
   *       500:
   *         description: 服务器内部错误
   */
  router.post('/auth/logout',
    authenticateToken,
    authController.logout,
  );

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [认证管理]
   *     summary: 刷新访问令牌（Token轮转机制）
   *     description: |
   *       使用Refresh Token轮转机制刷新访问令牌。
   *       
   *       **重要特性：**
   *       - 每次刷新都会生成新的access_token和refresh_token
   *       - 旧的refresh_token会立即失效，防止重放攻击
   *       - 如果检测到已撤销的token被重用，会撤销该用户的所有token
   *       - 支持设备识别和异常检测
   *       
   *       **安全机制：**
   *       - 前向安全：即使refresh_token泄露，也只能使用一次
   *       - 自动检测攻击：重复使用会触发安全响应
   *       - 设备追踪：记录每次刷新的设备信息
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
   *                 description: 当前有效的刷新令牌
   *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *     responses:
   *       200:
   *         description: 刷新成功，返回新的token对
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "令牌刷新成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     access_token:
   *                       type: string
   *                       description: 新的访问令牌（30分钟有效期）
   *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *                     refresh_token:
   *                       type: string
   *                       description: 新的刷新令牌（30天有效期）
   *                       example: "dGhpcyBpcyBhIG5ldyByZWZyZXNoIHRva2Vu..."
   *                     expires_in:
   *                       type: number
   *                       description: 访问令牌过期时间（秒）
   *                       example: 1800
   *                     token_type:
   *                       type: string
   *                       example: "Bearer"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 缺少refresh_token参数
   *       401:
   *         description: 刷新令牌无效、已过期或已被撤销
   *       403:
   *         description: 检测到可疑活动，已撤销所有用户token
   *       500:
   *         description: 服务器内部错误
   */
  router.post('/auth/refresh',
    validate(authValidation.refreshToken),
    authController.refreshToken,
  );

  /**
   * @swagger
   * /auth/sessions:
   *   get:
   *     tags: [会话管理]
   *     summary: 获取用户的活跃会话列表
   *     description: |
   *       获取当前用户的所有活跃会话信息，包括设备信息、登录时间等。
   *       用户可以查看自己在不同设备上的登录状态。
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
   *                 code:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取会话列表成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     sessions:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             description: 会话ID
   *                           deviceId:
   *                             type: string
   *                             description: 设备标识
   *                             nullable: true
   *                           userAgent:
   *                             type: string
   *                             description: 用户代理信息
   *                             nullable: true
   *                           ipAddress:
   *                             type: string
   *                             description: IP地址
   *                             nullable: true
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                             description: 会话创建时间
   *                           lastUsedAt:
   *                             type: string
   *                             format: date-time
   *                             description: 最后使用时间
   *                           isCurrent:
   *                             type: boolean
   *                             description: 是否为当前会话
   *                     total:
   *                       type: integer
   *                       description: 活跃会话总数
   *       401:
   *         description: 认证失败
   *       500:
   *         description: 服务器内部错误
   *   delete:
   *     tags: [会话管理]
   *     summary: 撤销所有其他会话
   *     description: |
   *       撤销当前用户的所有其他会话（除当前会话外）。
   *       这是一个安全操作，通常在用户怀疑账号被盗用时使用。
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: 撤销成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "所有其他会话已撤销"
   *                 data:
   *                   type: object
   *                   properties:
   *                     revokedCount:
   *                       type: integer
   *                       description: 被撤销的会话数量
   *       401:
   *         description: 认证失败
   *       500:
   *         description: 服务器内部错误
   */
  router.get('/auth/sessions',
    authenticateToken,
    authController.getUserSessions,
  );

  router.delete('/auth/sessions',
    authenticateToken,
    authController.revokeAllOtherSessions,
  );

  /**
   * @swagger
   * /auth/sessions/{sessionId}:
   *   delete:
   *     tags: [会话管理]
   *     summary: 撤销指定会话（远程登出）
   *     description: |
   *       撤销指定的会话，实现远程登出功能。
   *       用户可以登出其他设备上的会话，提高账号安全性。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: 要撤销的会话ID
   *         example: "550e8400-e29b-41d4-a716-446655440000"
   *     responses:
   *       200:
   *         description: 撤销成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "会话撤销成功"
   *                 data:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *       400:
   *         description: 会话ID无效
   *       401:
   *         description: 认证失败
   *       404:
   *         description: 会话不存在或已过期
   *       500:
   *         description: 服务器内部错误
   */
  router.delete('/auth/sessions/:sessionId',
    authenticateToken,
    authController.revokeUserSession,
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取成功"
   *                 data:
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
   *                       enum: [ADMIN, AUDITOR, OPERATOR, USER]
   *                     status:
   *                       type: string
   *                     department:
   *                       type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/auth/profile',
    authenticateToken,
    authController.getProfile,
  );

  /**
   * @swagger
   * /auth/profile:
   *   put:
   *     tags: [认证管理]
   *     summary: 更新个人信息
   *     description: 用户更新自己的基本信息（姓名、手机、部门）
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               realName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *                 description: 真实姓名
   *               phone:
   *                 type: string
   *                 maxLength: 20
   *                 description: 手机号码
   *               department:
   *                 type: string
   *                 maxLength: 100
   *                 description: 部门
   *     responses:
   *       200:
   *         description: 更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "更新个人信息成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: number
   *                     username:
   *                       type: string
   *                     realName:
   *                       type: string
   *                     email:
   *                       type: string
   *                     phone:
   *                       type: string
   *                     role:
   *                       type: string
   *                     status:
   *                       type: string
   *                     department:
   *                       type: string
   *                     updateTime:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put('/auth/profile',
    authenticateToken,
    validate(userManagementValidation.updateUser),
    authController.updateProfile,
  );

  /**
   * @swagger
   * /auth/password:
   *   put:
   *     tags: [认证管理]
   *     summary: 修改密码
   *     description: 用户修改自己的登录密码
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 minLength: 6
   *                 description: 当前密码
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *                 description: 新密码（必须包含大小写字母和数字）
   *     responses:
   *       200:
   *         description: 密码修改成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "密码修改成功"
   *                 data:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误或当前密码错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put('/auth/password',
    authenticateToken,
    validate(authValidation.changePassword),
    authController.changePassword,
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
   *                 enum: [ADMIN, AUDITOR, OPERATOR, USER]
   *                 description: 用户角色
   *               password:
   *                 type: string
   *                 description: 密码（必须包含大小写字母和数字）
   *     responses:
   *       201:
   *         description: 用户创建成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 201
   *                 message:
   *                   type: string
   *                   example: "用户创建成功"
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误或用户已存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/auth/register',
    authenticateToken,
    requirePermission('CREATE_USER'),
    validate(authValidation.register),
    authController.register,
  );

  /**
   * @swagger
   * /auth/self-register:
   *   post:
   *     tags: [认证管理]
   *     summary: 用户自助注册
   *     description: 新用户自行创建账号，无需管理员权限，默认角色为USER
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
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 description: 密码（必须包含大小写字母和数字）
   *     responses:
   *       201:
   *         description: 注册成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "注册成功，请等待管理员审核"
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 注册失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/auth/self-register',
    validate(authValidation.selfRegister),
    authController.selfRegister,
  );

  // ==================== 用户管理路由 ====================
  
  /**
   * @swagger
   * /users:
   *   get:
   *     tags: [用户管理]
   *     summary: 获取用户列表
   *     description: 获取系统中所有用户的分页列表，支持条件查询。仅限ADMIN权限。
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
   *         name: role
   *         schema:
   *           type: string
   *           enum: [ADMIN, AUDITOR, OPERATOR, USER]
   *         description: 用户角色
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [ACTIVE, INACTIVE]
   *         description: 用户状态
   *       - in: query
   *         name: keyword
   *         schema:
   *           type: string
   *         description: 关键字搜索（用户名、姓名、邮箱、部门）
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取成功"
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/PaginatedResponse'
   *                     - type: object
   *                       properties:
   *                         list:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/User'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/users',
    authenticateToken,
    requirePermission('VIEW_USERS'),
    validateQuery(userManagementValidation.getAllUsers),
    authController.getAllUsers,
  );

  /**
   * @swagger
   * /users/{userId}:
   *   get:
   *     tags: [用户管理]
   *     summary: 获取用户详情
   *     description: 根据用户ID获取用户详细信息。仅限ADMIN权限。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 用户ID
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取成功"
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 用户ID无效
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 用户不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/users/:userId',
    authenticateToken,
    requirePermission('VIEW_USERS'),
    authController.getUserById,
  );

  /**
   * @swagger
   * /users/{userId}/status:
   *   put:
   *     tags: [用户管理]
   *     summary: 更新用户状态
   *     description: 更新指定用户的状态（启用/禁用）。仅限ADMIN权限。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 用户ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 description: 用户状态
   *     responses:
   *       200:
   *         description: 更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "更新成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: number
   *                     username:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [ACTIVE, INACTIVE]
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 用户不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put('/users/:userId/status',
    authenticateToken,
    requirePermission('UPDATE_USER'),
    validate(userManagementValidation.updateUserStatus),
    authController.updateUserStatus,
  );

  /**
   * @swagger
   * /users/{userId}:
   *   put:
   *     tags: [用户管理]
   *     summary: 更新用户信息
   *     description: 管理员更新指定用户的所有信息，包括用户名、邮箱、角色、状态等。仅限ADMIN权限。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 用户ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 50
   *                 description: 用户名（字母、数字和下划线）
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 邮箱地址
   *               realName:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *                 description: 真实姓名
   *               phone:
   *                 type: string
   *                 maxLength: 20
   *                 description: 手机号码
   *               role:
   *                 type: string
   *                 enum: [ADMIN, AUDITOR, OPERATOR, USER]
   *                 description: 用户角色
   *               status:
   *                 type: string
   *                 enum: [ACTIVE, INACTIVE]
   *                 description: 用户状态
   *               department:
   *                 type: string
   *                 maxLength: 100
   *                 description: 部门
   *     responses:
   *       200:
   *         description: 更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "更新用户信息成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: number
   *                     username:
   *                       type: string
   *                     realName:
   *                       type: string
   *                     email:
   *                       type: string
   *                     phone:
   *                       type: string
   *                     role:
   *                       type: string
   *                     status:
   *                       type: string
   *                     department:
   *                       type: string
   *                     updateTime:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 用户不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put('/users/:userId',
    authenticateToken,
    requirePermission('UPDATE_USER'),
    validate(userManagementValidation.updateUser),
    authController.updateUser,
  );

  /**
   * @swagger
   * /users/{userId}/password:
   *   put:
   *     tags: [用户管理]
   *     summary: 重置用户密码
   *     description: 管理员重置指定用户的密码。仅限ADMIN权限。不能重置自己或其他管理员的密码。
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 用户ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - newPassword
   *             properties:
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *                 description: 新密码（必须包含大小写字母和数字）
   *     responses:
   *       200:
   *         description: 密码重置成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "密码重置成功"
   *                 data:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 用户不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put('/users/:userId/password',
    authenticateToken,
    requirePermission('UPDATE_USER'),
    validate(userManagementValidation.resetPassword),
    authController.resetPassword,
  );

  /**
   * @swagger
   * /users/{userId}:
   *   delete:
   *     tags: [用户管理]
   *     summary: 删除用户（软删除）
   *     description: |
   *       删除指定用户，使用软删除方式（将状态设为INACTIVE而不是物理删除）。
   *       
   *       **权限要求：** 仅限ADMIN权限
   *       
   *       **安全限制：**
   *       - 不能删除自己的账号
   *       - 不能删除其他管理员账号
   *       - 删除后用户无法登录，但数据得以保留
   *       
   *       **操作记录：**
   *       - 会记录详细的操作日志
   *       - 包含操作人、被删除用户、时间等信息
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: 要删除的用户ID
   *         example: 123
   *     responses:
   *       200:
   *         description: 删除成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "用户删除成功"
   *                 data:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 请求参数错误
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: integer
   *                   example: 400
   *                 message:
   *                   type: string
   *                   examples:
   *                     invalid_id: "用户ID无效"
   *                     self_delete: "不能删除自己的账号"
   *                     admin_delete: "不能删除管理员账号"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 认证失败，未登录或token无效
   *       403:
   *         description: 权限不足，需要ADMIN权限
   *       404:
   *         description: 指定的用户不存在
   *       500:
   *         description: 服务器内部错误
   */
  router.delete('/users/:userId',
    authenticateToken,
    requirePermission('DELETE_USER'),
    authController.deleteUser,
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/PaginatedResponse'
   *                     - type: object
   *                       properties:
   *                         list:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DefaultReason'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get('/default-reasons',
    authenticateToken,
    requirePermission('VIEW_DEFAULT_REASONS'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                       reason:
   *                         type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get('/default-reasons/enabled', 
    authenticateToken,
    requirePermission('VIEW_DEFAULT_REASONS'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   $ref: '#/components/schemas/DefaultReason'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 无效的ID
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 违约原因不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/default-reasons/:id', 
    authenticateToken,
    requirePermission('VIEW_DEFAULT_REASONS'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 201
   *                 message:
   *                   type: string
   *                   example: "创建成功"
   *                 data:
   *                   $ref: '#/components/schemas/DefaultReason'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数验证失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/default-reasons',
    authenticateToken,
    requirePermission('CREATE_DEFAULT_REASON'),
    validate(defaultReasonValidation.create),
    defaultReasonController.createReason,
  );
  
  /**
   * @swagger
   * /default-reasons/{id}:
   *   put:
   *     tags: [违约原因管理]
   *     summary: 更新违约原因
   *     description: 更新指定违约原因的信息，需要ADMIN或OPERATOR权限
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 违约原因ID
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
   *                 description: 是否启用
   *               sortOrder:
   *                 type: integer
   *                 description: 排序顺序
   *     responses:
   *       200:
   *         description: 更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "更新成功"
   *                 data:
   *                   $ref: '#/components/schemas/DefaultReason'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数验证失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 违约原因不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put('/default-reasons/:id',
    authenticateToken,
    requirePermission('UPDATE_DEFAULT_REASON'),
    validate(defaultReasonValidation.update),
    defaultReasonController.updateReason,
  );
  
  /**
   * @swagger
   * /default-reasons/{id}:
   *   delete:
   *     tags: [违约原因管理]
   *     summary: 删除违约原因
   *     description: 删除指定的违约原因，需要ADMIN权限
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 违约原因ID
   *     responses:
   *       200:
   *         description: 删除成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "删除成功"
   *                 data:
   *                   type: object
   *                   nullable: true
   *                   example: null
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 违约原因不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       409:
   *         description: 违约原因正在被使用，无法删除
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.delete('/default-reasons/:id',
    authenticateToken,
    requirePermission('DELETE_DEFAULT_REASON'),
    defaultReasonController.deleteReason,
  );
  
  /**
   * @swagger
   * /default-reasons/batch-status:
   *   post:
   *     tags: [违约原因管理]
   *     summary: 批量更新违约原因状态
   *     description: 批量启用或禁用违约原因，需要ADMIN权限
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ids
   *               - enabled
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: integer
   *                 minItems: 1
   *                 description: 违约原因ID列表
   *               enabled:
   *                 type: boolean
   *                 description: 启用状态
   *     responses:
   *       200:
   *         description: 批量更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "批量更新成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     successCount:
   *                       type: number
   *                       description: 成功更新数量
   *                     failCount:
   *                       type: number
   *                       description: 失败更新数量
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/default-reasons/batch-status',
    authenticateToken,
    requirePermission('UPDATE_DEFAULT_REASON'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 201
   *                 message:
   *                   type: string
   *                   example: "申请创建成功"
   *                 data:
   *                   $ref: '#/components/schemas/DefaultApplication'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/default-applications',
    authenticateToken,
    requirePermission('CREATE_DEFAULT_APPLICATION'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/PaginatedResponse'
   *                     - type: object
   *                       properties:
   *                         list:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DefaultApplication'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/default-applications',
    authenticateToken,
    requireAnyPermission(['VIEW_ALL_APPLICATIONS', 'VIEW_OWN_APPLICATIONS']),
    requireDataAccess(true),
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     applicationId:
   *                       type: string
   *                     customerId:
   *                       type: number
   *                     customerName:
   *                       type: string
   *                     latestExternalRating:
   *                       type: string
   *                     defaultReasons:
   *                       type: array
   *                       items:
   *                         type: number
   *                     severity:
   *                       type: string
   *                       enum: [HIGH, MEDIUM, LOW]
   *                     remark:
   *                       type: string
   *                     attachments:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           fileName:
   *                             type: string
   *                           fileUrl:
   *                             type: string
   *                           fileSize:
   *                             type: number
   *                     applicant:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [PENDING, APPROVED, REJECTED]
   *                     createTime:
   *                       type: string
   *                       format: date-time
   *                     approveTime:
   *                       type: string
   *                       format: date-time
   *                     approver:
   *                       type: string
   *                     approveRemark:
   *                       type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 申请不存在或无权限访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "审核成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     applicationId:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [APPROVED, REJECTED]
   *                     approver:
   *                       type: string
   *                     approveTime:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 申请不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/default-applications/:applicationId/approve',
    authenticateToken,
    requirePermission('APPROVE_APPLICATIONS'),
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "批量审核完成"
   *                 data:
   *                   type: object
   *                   properties:
   *                     successCount:
   *                       type: number
   *                       description: 成功处理数量
   *                     failCount:
   *                       type: number
   *                       description: 失败处理数量
   *                     details:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           applicationId:
   *                             type: string
   *                           success:
   *                             type: boolean
   *                           message:
   *                             type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/default-applications/batch-approve',
    authenticateToken,
    requirePermission('APPROVE_APPLICATIONS'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/PaginatedResponse'
   *                     - type: object
   *                       properties:
   *                         list:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DefaultCustomer'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/default-customers',
    authenticateToken,
    requireAnyPermission(['VIEW_ALL_CUSTOMERS', 'VIEW_OWN_CUSTOMERS']),
    requireDataAccess(false),
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
    requireAnyPermission(['EXPORT_ALL_DATA', 'EXPORT_OWN_DATA']),
    requireDataAccess(false),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/PaginatedResponse'
   *                     - type: object
   *                       properties:
   *                         list:
   *                           type: array
   *                           items:
   *                             $ref: '#/components/schemas/DefaultCustomer'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/default-customers/renewable',
    authenticateToken,
    requirePermission('VIEW_RENEWABLE_CUSTOMERS'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   $ref: '#/components/schemas/DefaultCustomer'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 违约客户不存在或无权限访问
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                         description: 重生原因ID
   *                       reason:
   *                         type: string
   *                         description: 重生原因名称
   *                       enabled:
   *                         type: boolean
   *                         description: 是否启用
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get('/renewal-reasons',
    authenticateToken,
    requirePermission('VIEW_DEFAULT_REASONS'),
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
   *                 code:
   *                   type: number
   *                   example: 201
   *                 message:
   *                   type: string
   *                   example: "申请创建成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     renewalId:
   *                       type: string
   *                     customerId:
   *                       type: number
   *                     customerName:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [PENDING]
   *                     createTime:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: 参数错误或客户状态不符合要求
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/renewals',
    authenticateToken,
    requirePermission('CREATE_RENEWAL_APPLICATION'),
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
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/PaginatedResponse'
   *                     - type: object
   *                       properties:
   *                         list:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               renewalId:
   *                                 type: string
   *                               customerId:
   *                                 type: number
   *                               customerName:
   *                                 type: string
   *                               renewalReason:
   *                                 type: object
   *                                 properties:
   *                                   id:
   *                                     type: number
   *                                   reason:
   *                                     type: string
   *                               status:
   *                                 type: string
   *                                 enum: [PENDING, APPROVED, REJECTED]
   *                               remark:
   *                                 type: string
   *                               applicant:
   *                                 type: string
   *                               createTime:
   *                                 type: string
   *                                 format: date-time
   *                               approver:
   *                                 type: string
   *                               approveTime:
   *                                 type: string
   *                                 format: date-time
   *                               approveRemark:
   *                                 type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/renewals',
    authenticateToken,
    requireAnyPermission(['VIEW_ALL_RENEWALS', 'VIEW_OWN_RENEWALS']),
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "查询成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     renewalId:
   *                       type: string
   *                     customerId:
   *                       type: number
   *                     customerName:
   *                       type: string
   *                     customerInfo:
   *                       type: object
   *                       properties:
   *                         industry:
   *                           type: string
   *                         region:
   *                           type: string
   *                         latestExternalRating:
   *                           type: string
   *                     renewalReason:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: number
   *                         reason:
   *                           type: string
   *                     originalDefaultReasons:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: number
   *                           reason:
   *                             type: string
   *                     status:
   *                       type: string
   *                       enum: [PENDING, APPROVED, REJECTED]
   *                     remark:
   *                       type: string
   *                     applicant:
   *                       type: string
   *                     createTime:
   *                       type: string
   *                       format: date-time
   *                     approver:
   *                       type: string
   *                     approveTime:
   *                       type: string
   *                       format: date-time
   *                     approveRemark:
   *                       type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 申请不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/renewals/:renewalId',
    authenticateToken,
    requireAnyPermission(['VIEW_ALL_RENEWALS', 'VIEW_OWN_RENEWALS']),
    requireDataAccess(true),
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "审核成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     renewalId:
   *                       type: string
   *                     status:
   *                       type: string
   *                       enum: [APPROVED, REJECTED]
   *                     approver:
   *                       type: string
   *                     approveTime:
   *                       type: string
   *                       format: date-time
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: 申请不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/renewals/:renewalId/approve',
    authenticateToken,
    requirePermission('APPROVE_RENEWALS'),
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "批量审核完成"
   *                 data:
   *                   type: object
   *                   properties:
   *                     successCount:
   *                       type: number
   *                       description: 成功处理数量
   *                     failCount:
   *                       type: number
   *                       description: 失败处理数量
   *                     details:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           renewalId:
   *                             type: string
   *                           success:
   *                             type: boolean
   *                           message:
   *                             type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: 未授权
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/renewals/batch-approve',
    authenticateToken,
    requirePermission('APPROVE_RENEWALS'),
    validate(renewalValidation.batchApprove),
    renewalController.batchApproveRenewals,
  );

  // TODO: 文件上传路由
  // router.post('/files/upload', upload.single('file'), fileController.uploadFile);

  // ==================== 统计分析路由 ====================
  
  /**
   * @swagger
   * /statistics/overview:
   *   get:
   *     tags: [统计分析]
   *     summary: 获取概览统计数据
   *     description: 获取系统整体统计概览数据，包括申请数量、客户数量等核心指标
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *           default: 2024
   *         description: 统计年份
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取概览统计数据成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     year:
   *                       type: number
   *                     defaultApplications:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: number
   *                         pending:
   *                           type: number
   *                         approved:
   *                           type: number
   *                         rejected:
   *                           type: number
   *                     renewalApplications:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: number
   *                         pending:
   *                           type: number
   *                         approved:
   *                           type: number
   *                         rejected:
   *                           type: number
   *                     customers:
   *                       type: object
   *                       properties:
   *                         totalDefault:
   *                           type: number
   *                     users:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: number
   *                         active:
   *                           type: number
   *       401:
   *         description: 未登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: 权限不足
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/statistics/overview',
    authenticateToken,
    requirePermission('VIEW_STATISTICS'),
    validateQuery(statisticsValidation.byIndustry),
    statisticsController.getOverviewStatistics,
  );

  /**
   * @swagger
   * /statistics/by-industry:
   *   get:
   *     tags: [统计分析]
   *     summary: 获取按行业统计数据
   *     description: 获取指定年份按行业维度的统计分析数据，支持违约和重生类型
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *           default: 2024
   *         description: 统计年份
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [DEFAULT, RENEWAL]
   *           default: DEFAULT
   *         description: 统计类型
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取行业统计数据成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     year:
   *                       type: number
   *                     type:
   *                       type: string
   *                       enum: [DEFAULT, RENEWAL]
   *                     total:
   *                       type: number
   *                     industries:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           industry:
   *                             type: string
   *                           count:
   *                             type: number
   *                           percentage:
   *                             type: number
   *                           trend:
   *                             type: string
   *                             enum: [UP, DOWN, STABLE]
   */
  router.get('/statistics/by-industry',
    authenticateToken,
    requirePermission('VIEW_STATISTICS'),
    validateQuery(statisticsValidation.byIndustry),
    statisticsController.getStatisticsByIndustry,
  );

  /**
   * @swagger
   * /statistics/by-region:
   *   get:
   *     tags: [统计分析]
   *     summary: 获取按区域统计数据
   *     description: 获取指定年份按区域维度的统计分析数据，支持违约和重生类型
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *           default: 2024
   *         description: 统计年份
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [DEFAULT, RENEWAL]
   *           default: DEFAULT
   *         description: 统计类型
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取区域统计数据成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     year:
   *                       type: number
   *                     type:
   *                       type: string
   *                       enum: [DEFAULT, RENEWAL]
   *                     total:
   *                       type: number
   *                     regions:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           region:
   *                             type: string
   *                           count:
   *                             type: number
   *                           percentage:
   *                             type: number
   *                           trend:
   *                             type: string
   *                             enum: [UP, DOWN, STABLE]
   */
  router.get('/statistics/by-region',
    authenticateToken,
    requirePermission('VIEW_STATISTICS'),
    validateQuery(statisticsValidation.byRegion),
    statisticsController.getStatisticsByRegion,
  );

  /**
   * @swagger
   * /statistics/trend:
   *   get:
   *     tags: [统计分析]
   *     summary: 获取趋势分析数据
   *     description: 获取指定时间范围内的趋势分析数据，支持按行业或区域维度分析
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: dimension
   *         required: true
   *         schema:
   *           type: string
   *           enum: [INDUSTRY, REGION]
   *         description: 分析维度
   *       - in: query
   *         name: target
   *         required: true
   *         schema:
   *           type: string
   *         description: 目标行业或区域名称
   *       - in: query
   *         name: startYear
   *         schema:
   *           type: integer
   *           default: 2020
   *         description: 开始年份
   *       - in: query
   *         name: endYear
   *         schema:
   *           type: integer
   *           default: 2024
   *         description: 结束年份
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取趋势分析数据成功"
   *                 data:
   *                   type: object
   *                   properties:
   *                     dimension:
   *                       type: string
   *                       enum: [INDUSTRY, REGION]
   *                     target:
   *                       type: string
   *                     trend:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           year:
   *                             type: number
   *                           defaultCount:
   *                             type: number
   *                           renewalCount:
   *                             type: number
   */
  router.get('/statistics/trend',
    authenticateToken,
    requirePermission('ADVANCED_ANALYTICS'),
    validateQuery(statisticsValidation.trend),
    statisticsController.getTrendStatistics,
  );

  /**
   * @swagger
   * /statistics/industries:
   *   get:
   *     tags: [统计分析]
   *     summary: 获取可用行业列表
   *     description: 获取系统中所有可用的行业名称列表，用于趋势分析等功能
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取行业列表成功"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: string
   */
  router.get('/statistics/industries',
    authenticateToken,
    requirePermission('VIEW_STATISTICS'),
    statisticsController.getAvailableIndustries,
  );

  /**
   * @swagger
   * /statistics/regions:
   *   get:
   *     tags: [统计分析]
   *     summary: 获取可用区域列表
   *     description: 获取系统中所有可用的区域名称列表，用于趋势分析等功能
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
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "获取区域列表成功"
   *                 data:
   *                   type: array
   *                   items:
   *                     type: string
   */
  router.get('/statistics/regions',
    authenticateToken,
    requirePermission('VIEW_STATISTICS'),
    statisticsController.getAvailableRegions,
  );

  /**
   * @swagger
   * /statistics/export:
   *   get:
   *     tags: [统计分析]
   *     summary: 导出统计报告
   *     description: 导出指定年份的统计分析报告，包含概览、行业和区域统计数据
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *           default: 2024
   *         description: 统计年份
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [DEFAULT, RENEWAL]
   *           default: DEFAULT
   *         description: 统计类型
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [excel, json]
   *           default: excel
   *         description: 导出格式
   *     responses:
   *       200:
   *         description: 导出成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 code:
   *                   type: number
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "导出统计报告成功"
   *                 data:
   *                   type: object
   */
  router.get('/statistics/export',
    authenticateToken,
    requirePermission('EXPORT_STATISTICS'),
    validateQuery(statisticsValidation.byIndustry),
    statisticsController.exportStatisticsReport,
  );

  return router;
};

export { initializeRoutes };
export default router;