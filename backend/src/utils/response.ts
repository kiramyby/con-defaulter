import { Response } from 'express';
import { ApiResponse } from '../types/api';

/**
 * 统一的API响应工具类
 */
export class ResponseUtil {
  /**
   * 成功响应
   */
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'success',
    code: number = 200,
  ): Response<ApiResponse<T>> {
    return res.status(200).json({
      code,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    message: string = 'error',
    code: number = 500,
    httpStatus: number = 500,
  ): Response<ApiResponse> {
    return res.status(httpStatus).json({
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 参数错误响应
   */
  static badRequest(
    res: Response,
    message: string = '请求参数错误',
  ): Response<ApiResponse> {
    return this.error(res, message, 400, 400);
  }

  /**
   * 未授权响应
   */
  static unauthorized(
    res: Response,
    message: string = '未授权访问',
  ): Response<ApiResponse> {
    return this.error(res, message, 401, 401);
  }

  /**
   * 权限不足响应
   */
  static forbidden(
    res: Response,
    message: string = '权限不足',
  ): Response<ApiResponse> {
    return this.error(res, message, 403, 403);
  }

  /**
   * 资源不存在响应
   */
  static notFound(
    res: Response,
    message: string = '资源不存在',
  ): Response<ApiResponse> {
    return this.error(res, message, 404, 404);
  }

  /**
   * 服务器内部错误响应
   */
  static internalError(
    res: Response,
    message: string = '服务器内部错误',
  ): Response<ApiResponse> {
    return this.error(res, message, 500, 500);
  }
}

/**
 * 分页响应工具
 */
export const createPaginatedResponse = <T>(
  list: T[],
  total: number,
  page: number,
  size: number,
) => ({
    total,
    page,
    size,
    list,
  });

export default ResponseUtil;