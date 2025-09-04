import { Request, Response, NextFunction } from 'express';
import '../types/express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import logger from '../config/logger';

// JWT认证中间件（简化版）
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
    
    // 直接使用JWT中的用户信息，无需每次查询数据库
    req.user = {
      id: decoded.id,
      email: decoded.email,
      dbId: decoded.dbId,
      username: decoded.username,
      realName: decoded.realName,
      role: decoded.role,
      status: decoded.status,
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