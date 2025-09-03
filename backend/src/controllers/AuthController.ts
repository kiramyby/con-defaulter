import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ResponseUtil } from '../utils/response';
import { config } from '../config/env';
import logger from '../config/logger';

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

      // 生成JWT令牌
      const payload = {
        id: dbUser.id.toString(),
        email: dbUser.email,
        dbId: Number(dbUser.id),
        username: dbUser.username,
        realName: dbUser.realName,
        role: dbUser.role,
        status: dbUser.status,
        department: dbUser.department,
      };

      const accessToken = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
      });

      const refreshToken = jwt.sign(
        { userId: dbUser.id.toString(), username: dbUser.username },
        config.JWT_SECRET,
        { expiresIn: '7d' }
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
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 86400, // 24小时
        token_type: 'bearer',
        user: payload,
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
      // 记录登出日志
      if (req.user) {
        await this.prisma.operationLog.create({
          data: {
            username: req.user.username,
            operationType: 'LOGOUT',
            businessType: 'SYSTEM',
            operationDesc: '用户登出',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
          },
        });

        logger.info(`用户登出: ${req.user.username}`);
      }

      return ResponseUtil.success(res, null, '登出成功');
    } catch (error: any) {
      logger.error('登出处理失败:', error);
      return ResponseUtil.internalError(res, '登出服务异常');
    }
  };

  /**
   * 刷新令牌
   */
  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return ResponseUtil.badRequest(res, '刷新令牌不能为空');
      }

      // 验证刷新令牌
      const decoded = jwt.verify(refresh_token, config.JWT_SECRET) as any;
      
      // 重新查询用户信息
      const dbUser = await this.prisma.user.findUnique({
        where: {
          id: BigInt(decoded.userId),
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
        },
      });

      if (!dbUser) {
        return ResponseUtil.unauthorized(res, '用户不存在或已被禁用');
      }

      // 生成新的访问令牌
      const payload = {
        id: dbUser.id.toString(),
        email: dbUser.email,
        dbId: Number(dbUser.id),
        username: dbUser.username,
        realName: dbUser.realName,
        role: dbUser.role,
        status: dbUser.status,
        department: dbUser.department,
      };

      const newAccessToken = jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
      });

      const newRefreshToken = jwt.sign(
        { userId: dbUser.id.toString(), username: dbUser.username },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info(`令牌刷新成功: ${dbUser.username}`);

      return ResponseUtil.success(res, {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 86400,
        token_type: 'bearer',
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
      const { page = 1, size = 10, role, status, keyword } = req.query as any;

      const skip = (parseInt(page) - 1) * parseInt(size);
      const take = parseInt(size);

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
        page: parseInt(page),
        size: parseInt(size),
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

      // 不能禁用其他管理员（除非是超级管理员）
      if (user.role === 'ADMIN' && status === 'INACTIVE' && req.user?.role !== 'SUPER_ADMIN') {
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
   * 用户注册（仅限ADMIN创建）
   */
  register = async (req: Request, res: Response) => {
    try {
      const { username, realName, email, phone, department, role, password } = req.body;

      // 检查邮箱是否已存在
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        return ResponseUtil.badRequest(res, '用户名或邮箱已存在');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户
      const newUser = await this.prisma.user.create({
        data: {
          username,
          realName,
          email,
          phone,
          department,
          role,
          hashedPassword,
          createdBy: req.user?.username || 'system',
        },
        select: {
          id: true,
          username: true,
          realName: true,
          email: true,
          role: true,
          status: true,
          department: true,
          createTime: true,
        }
      });

      // 记录操作日志
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

      logger.info(`创建用户成功: ${username} by ${req.user?.username || 'system'}`);

      return ResponseUtil.success(res, newUser, '用户创建成功', 201);
    } catch (error: any) {
      logger.error('用户注册失败:', error);
      return ResponseUtil.internalError(res, '用户注册服务异常');
    }
  };
}