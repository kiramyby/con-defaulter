import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import logger from '../config/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// JWT认证中间件（增强版，包含用户状态验证）
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      code: 401,
      message: '需要认证token',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 验证JWT token并获取用户信息
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // 验证用户状态（防止JWT未过期但用户已被禁用的情况）
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(decoded.dbId) },
      select: { status: true, role: true }
    });

    if (!currentUser) {
      logger.warn(`用户不存在但JWT仍有效: ${decoded.username}`);
      return res.status(403).json({
        code: 403,
        message: '用户账号不存在',
        timestamp: new Date().toISOString()
      });
    }

    if (currentUser.status !== 'ACTIVE') {
      logger.warn(`用户已被禁用但JWT仍有效: ${decoded.username}`);
      return res.status(403).json({
        code: 403,
        message: '用户账号已被禁用，请联系管理员',
        timestamp: new Date().toISOString()
      });
    }

    // 设置用户信息，使用数据库中的最新状态
    req.user = {
      id: decoded.id, // JWT中的id字段（字符串格式的数据库ID）
      email: decoded.email,
      dbId: decoded.dbId, // JWT中的dbId字段（数字格式的数据库ID）
      username: decoded.username,
      realName: decoded.realName,
      role: currentUser.role, // 使用最新的角色信息
      status: currentUser.status, // 使用最新的状态信息
      department: decoded.department
    };

    next();
  } catch (error) {
    logger.error('认证错误:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ 
        code: 403,
        message: '无效的token',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({ 
        code: 403,
        message: 'token已过期',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({ 
      code: 500,
      message: '认证服务错误',
      timestamp: new Date().toISOString()
    });
  }
};

// 角色权限检查中间件
export const requireRole = (allowedRoles: ('ADMIN' | 'AUDITOR' | 'OPERATOR' | 'USER')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`权限不足: ${req.user.username} 尝试访问 ${req.method} ${req.path}, 需要角色: ${allowedRoles.join('|')}, 当前角色: ${req.user.role}`);
      
      return res.status(403).json({ 
        code: 403,
        message: '权限不足，无法访问该资源',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// 检查用户是否可以操作特定数据（数据级别权限）
export const requireDataAccess = (checkOwnership = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    // 管理员可以访问所有数据
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // 如果需要检查数据所有权，将检查逻辑传递给控制器
    req.checkDataAccess = {
      username: req.user.username,
      role: req.user.role,
      checkOwnership
    };

    next();
  };
};