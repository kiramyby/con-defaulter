import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ResponseUtil } from '../utils/response';
import { config } from '../config/env';
import logger from '../config/logger';
import tokenService from '../services/TokenService';

export class AuthController {
  constructor(private prisma: PrismaClient) {}

  /**
   * 用户登录（简化版，不依赖Supabase Auth）
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ResponseUtil.badRequest(res, '邮箱和密码不能为空');
      }

      // 从数据库查找用户（包含密码字段）
      const dbUser = await this.prisma.user.findFirst({
        where: {
          email,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          role: true,
          status: true,
          department: true,
          hashedPassword: true,
        },
      });

      if (!dbUser) {
        logger.warn(`登录失败: 用户不存在或已禁用 ${email}`);
        return ResponseUtil.unauthorized(res, '邮箱或密码错误');
      }

      // 验证密码
      if (!dbUser.hashedPassword) {
        logger.warn(`登录失败: 用户未设置密码 ${email}`);
        return ResponseUtil.unauthorized(res, '邮箱或密码错误');
      }

      const isValidPassword = await bcrypt.compare(password, dbUser.hashedPassword);
      if (!isValidPassword) {
        logger.warn(`登录失败: 密码错误 ${email}`);
        return ResponseUtil.unauthorized(res, '邮箱或密码错误');
      }

      // 使用TokenService生成token对
      const userInfo = {
        id: dbUser.id.toString(),
        email: dbUser.email,
        username: dbUser.username,
        realName: dbUser.realName,
        role: dbUser.role,
        status: dbUser.status,
        department: dbUser.department,
      };

      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress,
      };

      const tokenPair = await tokenService.generateTokenPair(
        dbUser.id,
        userInfo,
        deviceInfo
      );

      // 更新最后登录时间
      await this.prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginTime: new Date() },
      });

      // 记录登录日志
      await this.prisma.operationLog.create({
        data: {
          username: dbUser.username,
          operationType: 'LOGIN',
          businessType: 'SYSTEM',
          operationDesc: '用户登录',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`用户登录成功: ${dbUser.username} (${email})`);

      return ResponseUtil.success(res, {
        access_token: tokenPair.accessToken,
        refresh_token: tokenPair.refreshToken,
        expires_in: tokenPair.expiresIn,
        token_type: tokenPair.tokenType,
        user: userInfo,
      }, '登录成功');

    } catch (error: any) {
      logger.error('登录处理失败:', error);
      return ResponseUtil.internalError(res, '登录服务异常');
    }
  };

  /**
   * 用户登出
   */
  logout = async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      // 用户信息（来自中间件或令牌解析）
      let username = req.user?.username;
      let userId = req.user?.dbId;

      // 如果中间件没有解析出用户信息，尝试从令牌解析
      if (!username && token) {
        try {
          const decoded = jwt.verify(token, config.JWT_SECRET) as any;
          username = decoded.username;
          userId = decoded.dbId;
          logger.info(`从令牌解析用户信息: ${username}`);
        } catch (jwtError) {
          logger.warn('令牌解析失败，但继续处理登出');
        }
      }

      // 撤销refresh token
      if (req.body.refresh_token) {
        try {
          await tokenService.revokeRefreshToken(req.body.refresh_token, 'logout');
          logger.info(`Refresh token revoked on logout: ${username || 'unknown'}`);
        } catch (revokeError) {
          logger.error('Failed to revoke refresh token:', revokeError);
          // 不阻断登出流程，继续执行
        }
      }

      // 记录登出日志（无论令牌是否有效都记录）
      if (username) {
        try {
          await this.prisma.operationLog.create({
            data: {
              username,
              operationType: 'LOGOUT',
              businessType: 'SYSTEM',
              operationDesc: '用户登出',
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
            },
          });
          logger.info(`用户登出成功: ${username}`);
        } catch (logError) {
          logger.error('登出日志记录失败:', logError);
        }
      }

      // 返回登出成功响应
      return ResponseUtil.success(res, {
        message: '登出成功',
        timestamp: new Date().toISOString(),
        instruction: '认证令牌已失效，请重新登录'
      }, '登出成功');
      
    } catch (error: any) {
      logger.error('登出处理失败:', error);
      // 即使出现错误，也要返回成功，因为登出是一个"最大努力"操作
      return ResponseUtil.success(res, null, '登出成功');
    }
  };

  /**
   * 刷新令牌（使用轮转机制）
   */
  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return ResponseUtil.badRequest(res, '刷新令牌不能为空');
      }

      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection?.remoteAddress,
      };

      // 使用TokenService进行token轮转
      const newTokenPair = await tokenService.refreshTokenPair(
        refresh_token,
        deviceInfo
      );

      logger.info(`令牌刷新成功`);

      return ResponseUtil.success(res, {
        access_token: newTokenPair.accessToken,
        refresh_token: newTokenPair.refreshToken,
        expires_in: newTokenPair.expiresIn,
        token_type: newTokenPair.tokenType,
      }, '令牌刷新成功');

    } catch (error: any) {
      logger.error('令牌刷新失败:', error);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return ResponseUtil.unauthorized(res, '刷新令牌无效或已过期');
      }
      return ResponseUtil.internalError(res, '令牌刷新服务异常');
    }
  };

  /**
   * 获取当前用户信息
   */
  getProfile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res, '未登录');
      }

      return ResponseUtil.success(res, req.user, '获取用户信息成功');
    } catch (error: any) {
      logger.error('获取用户信息失败:', error);
      return ResponseUtil.internalError(res, '获取用户信息服务异常');
    }
  };

  /**
   * 获取所有用户信息（仅限ADMIN）
   * GET /api/v1/users
   */
  getAllUsers = async (req: Request, res: Response) => {
    try {
      // 确保分页参数为数字类型（URL查询参数默认为字符串）
      const page = Number(req.query.page) || 1;
      const size = Number(req.query.size) || 10;
      const { role, status, keyword } = req.query as any;

      const skip = (page - 1) * size;
      const take = size;

      // 构建查询条件
      const where: any = {};
      
      if (role) where.role = role;
      if (status) where.status = status;
      if (keyword) {
        where.OR = [
          { username: { contains: keyword, mode: 'insensitive' } },
          { realName: { contains: keyword, mode: 'insensitive' } },
          { email: { contains: keyword, mode: 'insensitive' } },
          { department: { contains: keyword, mode: 'insensitive' } },
        ];
      }

      const [total, users] = await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            department: true,
            createTime: true,
            updateTime: true,
            lastLoginTime: true,
            createdBy: true,
          },
          orderBy: { createTime: 'desc' },
          skip,
          take,
        }),
      ]);

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'VIEW',
          businessType: 'USER_MANAGEMENT',
          operationDesc: '查看用户列表',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      const result = {
        total,
        page,
        size,
        list: users.map(user => ({
          id: Number(user.id),
          username: user.username,
          realName: user.realName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          department: user.department,
          createTime: user.createTime.toISOString(),
          updateTime: user.updateTime.toISOString(),
          lastLoginTime: user.lastLoginTime?.toISOString(),
          createdBy: user.createdBy,
        })),
      };

      logger.info(`管理员查看用户列表: ${req.user?.username}, 返回${users.length}条记录`);

      return ResponseUtil.success(res, result, '获取用户列表成功');
    } catch (error: any) {
      logger.error('获取用户列表失败:', error);
      return ResponseUtil.internalError(res, '获取用户列表服务异常');
    }
  };

  /**
   * 获取指定用户详情（仅限ADMIN）
   * GET /api/v1/users/:userId
   */
  getUserById = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(Number(userId))) {
        return ResponseUtil.badRequest(res, '用户ID无效');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          department: true,
          createTime: true,
          updateTime: true,
          lastLoginTime: true,
          createdBy: true,
        },
      });

      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'VIEW',
          businessType: 'USER_MANAGEMENT',
          operationDesc: `查看用户详情: ${user.username}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      const result = {
        id: Number(user.id),
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        department: user.department,
        createTime: user.createTime.toISOString(),
        updateTime: user.updateTime.toISOString(),
        lastLoginTime: user.lastLoginTime?.toISOString(),
        createdBy: user.createdBy,
      };

      logger.info(`管理员查看用户详情: ${req.user?.username} -> ${user.username}`);

      return ResponseUtil.success(res, result, '获取用户详情成功');
    } catch (error: any) {
      logger.error('获取用户详情失败:', error);
      return ResponseUtil.internalError(res, '获取用户详情服务异常');
    }
  };

  /**
   * 更新用户状态（仅限ADMIN）
   * PUT /api/v1/users/:userId/status
   */
  updateUserStatus = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!userId || isNaN(Number(userId))) {
        return ResponseUtil.badRequest(res, '用户ID无效');
      }

      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return ResponseUtil.badRequest(res, '用户状态无效');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { username: true, status: true, role: true },
      });

      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 不能禁用自己
      if (req.user?.username === user.username && status === 'INACTIVE') {
        return ResponseUtil.badRequest(res, '不能禁用自己的账号');
      }

      // 不能禁用其他管理员账号
      if (user.role === 'ADMIN' && status === 'INACTIVE' && req.user?.role !== 'ADMIN') {
        return ResponseUtil.forbidden(res, '无权限禁用其他管理员账号');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { status },
        select: {
          id: true,
          username: true,
          status: true,
        },
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'UPDATE',
          businessType: 'USER_MANAGEMENT',
          operationDesc: `更新用户状态: ${user.username} -> ${status}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`更新用户状态: ${user.username} -> ${status} by ${req.user?.username}`);

      return ResponseUtil.success(res, {
        id: Number(updatedUser.id),
        username: updatedUser.username,
        status: updatedUser.status,
      }, '更新用户状态成功');
    } catch (error: any) {
      logger.error('更新用户状态失败:', error);
      return ResponseUtil.internalError(res, '更新用户状态服务异常');
    }
  };

  /**
   * 更新用户信息（用户更新自己的基本信息）
   * PUT /api/v1/auth/profile
   */
  updateProfile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res, '未登录');
      }

      const { realName, phone, department } = req.body;
      const userId = req.user.dbId;

      // 构建更新数据
      const updateData: any = {};
      if (realName !== undefined) updateData.realName = realName;
      if (phone !== undefined) updateData.phone = phone;
      if (department !== undefined) updateData.department = department;

      // 如果没有更新数据
      if (Object.keys(updateData).length === 0) {
        return ResponseUtil.badRequest(res, '没有需要更新的信息');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: updateData,
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          department: true,
          updateTime: true,
        },
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user.username,
          operationType: 'UPDATE',
          businessType: 'USER_MANAGEMENT',
          operationDesc: '更新个人信息',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`用户更新个人信息: ${req.user.username}`);

      const result = {
        id: Number(updatedUser.id),
        username: updatedUser.username,
        realName: updatedUser.realName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        department: updatedUser.department,
        updateTime: updatedUser.updateTime.toISOString(),
      };

      return ResponseUtil.success(res, result, '更新个人信息成功');
    } catch (error: any) {
      logger.error('更新个人信息失败:', error);
      return ResponseUtil.internalError(res, '更新个人信息服务异常');
    }
  };

  /**
   * 管理员更新用户信息
   * PUT /api/v1/users/:userId
   */
  updateUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { username, email, realName, phone, role, status, department } = req.body;

      if (!userId || isNaN(Number(userId))) {
        return ResponseUtil.badRequest(res, '用户ID无效');
      }

      const targetUser = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { username: true, role: true, email: true, status: true },
      });

      if (!targetUser) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 检查角色权限
      const validRoles = ['ADMIN', 'AUDITOR', 'OPERATOR', 'USER'];
      if (role && !validRoles.includes(role)) {
        return ResponseUtil.badRequest(res, '用户角色无效');
      }

      // 检查状态权限
      const validStatuses = ['ACTIVE', 'INACTIVE'];
      if (status && !validStatuses.includes(status)) {
        return ResponseUtil.badRequest(res, '用户状态无效');
      }

      // 如果更新用户名，检查是否重复
      if (username && username !== targetUser.username) {
        const existingUser = await this.prisma.user.findUnique({
          where: { username },
        });
        if (existingUser) {
          return ResponseUtil.badRequest(res, '用户名已存在');
        }
      }

      // 如果更新邮箱，检查是否重复
      if (email && email !== targetUser.email) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email },
        });
        if (existingEmail) {
          return ResponseUtil.badRequest(res, '邮箱已被使用');
        }
      }

      // 构建更新数据
      const updateData: any = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (realName !== undefined) updateData.realName = realName;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (department !== undefined) updateData.department = department;

      // 如果没有更新数据
      if (Object.keys(updateData).length === 0) {
        return ResponseUtil.badRequest(res, '没有需要更新的信息');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: updateData,
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          department: true,
          updateTime: true,
        },
      });

      // 如果用户状态被设为INACTIVE，撤销所有token
      if (status === 'INACTIVE' && targetUser.status !== 'INACTIVE') {
        try {
          const revokedCount = await tokenService.revokeAllUserTokens(
            BigInt(userId),
            'user_deactivated'
          );
          logger.info(`用户被禁用，已撤销${revokedCount}个token: ${targetUser.username}`);
        } catch (tokenError) {
          logger.error('撤销用户token失败:', tokenError);
          // 不阻断更新流程
        }
      }

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'UPDATE',
          businessType: 'USER_MANAGEMENT',
          operationDesc: `更新用户信息: ${targetUser.username}${status === 'INACTIVE' ? ' (用户被禁用)' : ''}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`管理员更新用户信息: ${targetUser.username} by ${req.user?.username}`);

      const result = {
        id: Number(updatedUser.id),
        username: updatedUser.username,
        realName: updatedUser.realName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        department: updatedUser.department,
        updateTime: updatedUser.updateTime.toISOString(),
      };

      return ResponseUtil.success(res, result, '更新用户信息成功');
    } catch (error: any) {
      logger.error('更新用户信息失败:', error);
      return ResponseUtil.internalError(res, '更新用户信息服务异常');
    }
  };

  /**
   * 修改密码（用户修改自己的密码）
   * PUT /api/v1/auth/password
   */
  changePassword = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return ResponseUtil.unauthorized(res, '未登录');
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.dbId;

      // 获取当前用户的密码哈希
      const user = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { username: true, hashedPassword: true },
      });

      if (!user || !user.hashedPassword) {
        return ResponseUtil.unauthorized(res, '用户信息异常');
      }

      // 验证当前密码
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!isValidCurrentPassword) {
        return ResponseUtil.badRequest(res, '当前密码错误');
      }

      // 检查新密码是否与当前密码相同
      const isSamePassword = await bcrypt.compare(newPassword, user.hashedPassword);
      if (isSamePassword) {
        return ResponseUtil.badRequest(res, '新密码不能与当前密码相同');
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { hashedPassword: hashedNewPassword },
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user.username,
          operationType: 'UPDATE',
          businessType: 'USER_MANAGEMENT',
          operationDesc: '修改密码',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`用户修改密码: ${req.user.username}`);

      return ResponseUtil.success(res, null, '密码修改成功');
    } catch (error: any) {
      logger.error('修改密码失败:', error);
      return ResponseUtil.internalError(res, '修改密码服务异常');
    }
  };

  /**
   * 重置用户密码（仅限ADMIN）
   * PUT /api/v1/users/:userId/password
   */
  resetPassword = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!userId || isNaN(Number(userId))) {
        return ResponseUtil.badRequest(res, '用户ID无效');
      }

      const targetUser = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { username: true, role: true },
      });

      if (!targetUser) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 不能重置自己的密码
      if (req.user?.username === targetUser.username) {
        return ResponseUtil.badRequest(res, '不能重置自己的密码，请使用修改密码功能');
      }

      // 不能重置其他管理员密码
      if (targetUser.role === 'ADMIN' && req.user?.role !== 'ADMIN') {
        return ResponseUtil.forbidden(res, '无权限重置其他管理员密码');
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { hashedPassword: hashedNewPassword },
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'UPDATE',
          businessType: 'USER_MANAGEMENT',
          operationDesc: `重置用户密码: ${targetUser.username}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`管理员重置用户密码: ${targetUser.username} by ${req.user?.username}`);

      return ResponseUtil.success(res, null, '密码重置成功');
    } catch (error: any) {
      logger.error('重置密码失败:', error);
      return ResponseUtil.internalError(res, '重置密码服务异常');
    }
  };

  /**
   * 用户注册（仅限ADMIN创建）
   */
  register = async (req: Request, res: Response) => {
    try {
      const { username, realName, email, phone, department, role, password } = req.body;

      // 验证必填字段
      if (!username || !realName || !email || !role || !password) {
        return ResponseUtil.badRequest(res, '用户名、真实姓名、邮箱、角色和密码不能为空');
      }

      logger.info(`开始创建用户: ${username}, 邮箱: ${email}, 角色: ${role}`);

      // 检查邮箱和用户名是否已存在
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.email === email ? '邮箱' : '用户名';
        logger.warn(`用户创建失败: ${field}已存在 - ${existingUser.email === email ? email : username}`);
        return ResponseUtil.badRequest(res, `${field}已存在`);
      }

      // 验证角色
      const validRoles = ['ADMIN', 'AUDITOR', 'OPERATOR', 'USER'];
      if (!validRoles.includes(role)) {
        return ResponseUtil.badRequest(res, '无效的用户角色');
      }

      // 加密密码
      logger.info('开始加密密码');
      const hashedPassword = await bcrypt.hash(password, 10);
      logger.info('密码加密完成');

      // 创建用户
      logger.info('开始创建用户记录');
      const newUser = await this.prisma.user.create({
        data: {
          username: username.trim(),
          realName: realName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          department: department?.trim() || null,
          role: role as any,
          hashedPassword,
          createdBy: req.user?.username || 'system',
        },
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          department: true,
          createTime: true,
        }
      });
      logger.info(`用户记录创建成功: ID=${newUser.id}`);

      // 记录操作日志
      try {
        await this.prisma.operationLog.create({
          data: {
            username: req.user?.username || 'system',
            operationType: 'CREATE',
            businessType: 'USER_MANAGEMENT',
            operationDesc: `创建用户: ${username} (${email})`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          },
        });
        logger.info('操作日志记录成功');
      } catch (logError) {
        logger.error('操作日志记录失败:', logError);
        // 不影响用户创建的成功响应
      }

      logger.info(`创建用户成功: ${username} by ${req.user?.username || 'system'}`);

      const result = {
        id: Number(newUser.id),
        username: newUser.username,
        realName: newUser.realName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        department: newUser.department,
        createTime: newUser.createTime.toISOString(),
      };

      return ResponseUtil.success(res, result, '用户创建成功', 201);
    } catch (error: any) {
      logger.error('用户注册失败:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta
      });
      
      // 处理特定的数据库错误
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('email')) {
          return ResponseUtil.badRequest(res, '邮箱已存在');
        }
        if (target?.includes('username')) {
          return ResponseUtil.badRequest(res, '用户名已存在');
        }
        return ResponseUtil.badRequest(res, '数据重复，用户名或邮箱已存在');
      }
      
      if (error.code === 'P2003') {
        return ResponseUtil.badRequest(res, '数据关联错误');
      }

      return ResponseUtil.internalError(res, `用户注册服务异常: ${error.message}`);
    }
  };

  /**
   * 自助用户注册（无需管理员权限）
   * POST /api/v1/auth/self-register
   */
  selfRegister = async (req: Request, res: Response) => {
    try {
      const { username, realName, email, phone, department, password } = req.body;

      // 验证必填字段
      if (!username || !realName || !email || !password) {
        return ResponseUtil.badRequest(res, '用户名、真实姓名、邮箱和密码不能为空');
      }

      logger.info(`用户自助注册: ${username}, 邮箱: ${email}`);

      // 检查邮箱和用户名是否已存在
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: email.trim().toLowerCase() },
            { username: username.trim() }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.email === email.trim().toLowerCase() ? '邮箱' : '用户名';
        logger.warn(`自助注册失败: ${field}已存在`);
        return ResponseUtil.badRequest(res, `${field}已存在`);
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户（默认角色为USER，状态为ACTIVE）
      const newUser = await this.prisma.user.create({
        data: {
          username: username.trim(),
          realName: realName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          department: department?.trim() || null,
          role: 'USER', // 自助注册默认为普通用户
          status: 'ACTIVE', // 可以根据业务需求改为需要审批
          hashedPassword,
          createdBy: 'self-register',
        },
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          department: true,
          createTime: true,
        }
      });

      // 记录操作日志
      try {
        await this.prisma.operationLog.create({
          data: {
            username: newUser.username,
            operationType: 'REGISTER',
            businessType: 'USER_MANAGEMENT',
            operationDesc: `用户自助注册: ${username} (${email})`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          },
        });
      } catch (logError) {
        logger.error('操作日志记录失败:', logError);
      }

      logger.info(`用户自助注册成功: ${username}`);

      const result = {
        id: Number(newUser.id),
        username: newUser.username,
        realName: newUser.realName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        department: newUser.department,
        createTime: newUser.createTime.toISOString(),
      };

      return ResponseUtil.success(res, result, '注册成功，请等待管理员审核', 201);
    } catch (error: any) {
      logger.error('用户自助注册失败:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta
      });
      
      // 处理特定的数据库错误
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('email')) {
          return ResponseUtil.badRequest(res, '邮箱已存在');
        }
        if (target?.includes('username')) {
          return ResponseUtil.badRequest(res, '用户名已存在');
        }
        return ResponseUtil.badRequest(res, '数据重复，用户名或邮箱已存在');
      }

      return ResponseUtil.internalError(res, `注册服务异常: ${error.message}`);
    }
  };

  /**
   * 删除用户（仅限ADMIN）
   * DELETE /api/v1/users/:userId
   */
  deleteUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId || isNaN(Number(userId))) {
        return ResponseUtil.badRequest(res, '用户ID无效');
      }

      const targetUser = await this.prisma.user.findUnique({
        where: { id: BigInt(userId) },
        select: { 
          username: true, 
          role: true, 
          email: true,
          status: true 
        },
      });

      if (!targetUser) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 不能删除自己
      if (req.user?.username === targetUser.username) {
        return ResponseUtil.badRequest(res, '不能删除自己的账号');
      }

      // 不能删除其他管理员
      if (targetUser.role === 'ADMIN') {
        return ResponseUtil.forbidden(res, '不能删除管理员账号');
      }

      // 软删除：将用户状态改为INACTIVE而不是物理删除
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { 
          status: 'INACTIVE',
          updateTime: new Date(),
        },
      });

      // 撤销被删除用户的所有token
      try {
        const revokedCount = await tokenService.revokeAllUserTokens(
          BigInt(userId),
          'user_deleted'
        );
        logger.info(`用户被删除，已撤销${revokedCount}个token: ${targetUser.username}`);
      } catch (tokenError) {
        logger.error('撤销被删除用户的token失败:', tokenError);
        // 不阻断删除流程
      }

      // 记录操作日志
      try {
        await this.prisma.operationLog.create({
          data: {
            username: req.user?.username || 'system',
            operationType: 'DELETE',
            businessType: 'USER_MANAGEMENT',
            operationDesc: `删除用户: ${targetUser.username} (${targetUser.email})`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          },
        });
      } catch (logError) {
        logger.error('操作日志记录失败:', logError);
      }

      logger.info(`管理员删除用户: ${req.user?.username} -> ${targetUser.username}`);

      return ResponseUtil.success(res, null, '用户删除成功');
    } catch (error: any) {
      logger.error('删除用户失败:', error);
      return ResponseUtil.internalError(res, '删除用户服务异常');
    }
  };

  /**
   * 获取用户的活跃会话列表
   * GET /api/v1/auth/sessions
   */
  getUserSessions = async (req: Request, res: Response) => {
    try {
      if (!req.user?.dbId) {
        return ResponseUtil.unauthorized(res, '用户信息无效');
      }

      const sessions = await tokenService.getUserActiveSessions(BigInt(req.user.dbId));
      
      // 格式化会话信息
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        isCurrent: false, // 可以通过比较当前请求的设备信息来判断
      }));

      return ResponseUtil.success(res, {
        sessions: formattedSessions,
        total: formattedSessions.length,
      }, '获取会话列表成功');
    } catch (error: any) {
      logger.error('获取会话列表失败:', error);
      return ResponseUtil.internalError(res, '获取会话列表服务异常');
    }
  };

  /**
   * 删除指定会话（远程登出）
   * DELETE /api/v1/auth/sessions/:sessionId
   */
  revokeUserSession = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      if (!req.user?.dbId) {
        return ResponseUtil.unauthorized(res, '用户信息无效');
      }

      if (!sessionId) {
        return ResponseUtil.badRequest(res, '会话ID不能为空');
      }

      const success = await tokenService.revokeSession(BigInt(req.user.dbId), sessionId);
      
      if (!success) {
        return ResponseUtil.notFound(res, '会话不存在或已过期');
      }

      // 记录操作日志
      try {
        await this.prisma.operationLog.create({
          data: {
            username: req.user.username,
            operationType: 'REVOKE_SESSION',
            businessType: 'SECURITY',
            operationDesc: `撤销会话: ${sessionId}`,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
          },
        });
      } catch (logError) {
        logger.error('操作日志记录失败:', logError);
      }

      logger.info(`用户撤销会话: ${req.user.username} -> ${sessionId}`);

      return ResponseUtil.success(res, null, '会话撤销成功');
    } catch (error: any) {
      logger.error('撤销会话失败:', error);
      return ResponseUtil.internalError(res, '撤销会话服务异常');
    }
  };

  /**
   * 撤销所有其他会话（除当前会话外）
   * DELETE /api/v1/auth/sessions
   */
  revokeAllOtherSessions = async (req: Request, res: Response) => {
    try {
      if (!req.user?.dbId) {
        return ResponseUtil.unauthorized(res, '用户信息无效');
      }

      const revokedCount = await tokenService.revokeAllUserTokens(
        BigInt(req.user.dbId), 
        'revoke_other_sessions'
      );

      // 记录操作日志
      try {
        await this.prisma.operationLog.create({
          data: {
            username: req.user.username,
            operationType: 'REVOKE_ALL_SESSIONS',
            businessType: 'SECURITY',
            operationDesc: `撤销所有其他会话，共${revokedCount}个`,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
          },
        });
      } catch (logError) {
        logger.error('操作日志记录失败:', logError);
      }

      logger.info(`用户撤销所有其他会话: ${req.user.username}, 数量: ${revokedCount}`);

      return ResponseUtil.success(res, {
        revokedCount,
      }, '所有其他会话已撤销');
    } catch (error: any) {
      logger.error('撤销所有会话失败:', error);
      return ResponseUtil.internalError(res, '撤销会话服务异常');
    }
  };
}