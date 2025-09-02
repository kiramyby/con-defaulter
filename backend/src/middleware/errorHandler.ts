import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from '../utils/response';
import logger from '../config/logger';

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // 记录错误日志
  logger.error('未处理的错误:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Prisma 错误处理
  if (err.code) {
    switch (err.code) {
    case 'P2002':
      return ResponseUtil.badRequest(res, '数据冲突，记录已存在');
    case 'P2003':
      return ResponseUtil.badRequest(res, '外键约束违反');
    case 'P2025':
      return ResponseUtil.notFound(res, '记录不存在');
    case 'P2014':
      return ResponseUtil.badRequest(res, '数据关系冲突');
    default:
      return ResponseUtil.internalError(res, '数据库操作失败');
    }
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    return ResponseUtil.badRequest(res, err.message);
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return ResponseUtil.unauthorized(res, 'Token无效');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseUtil.unauthorized(res, 'Token已过期');
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ResponseUtil.badRequest(res, '文件大小超出限制');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ResponseUtil.badRequest(res, '不支持的文件类型');
  }

  // 默认错误处理
  return ResponseUtil.internalError(res, 
    process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
  );
};

/**
 * 404 处理中间件
 */
export const notFoundHandler = (req: Request, res: Response) => {
  return ResponseUtil.notFound(res, `路由 ${req.method} ${req.url} 不存在`);
};

/**
 * 异步错误包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};