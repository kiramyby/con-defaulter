import { Request, Response } from 'express';
import '../types/express';
import { DefaultReasonService } from '../services/DefaultReasonService';
import { ResponseUtil } from '../utils/response';
import logger from '../config/logger';

export class DefaultReasonController {
  constructor(private defaultReasonService: DefaultReasonService) {}

  /**
   * 获取违约原因列表
   * GET /api/v1/default-reasons
   */
  getReasons = async (req: Request, res: Response) => {
    try {
      const { page, size, enabled } = req.query as any;
      
      const result = await this.defaultReasonService.getDefaultReasons(page, size, enabled);
      
      return ResponseUtil.success(res, result, '查询成功');
    } catch (error: any) {
      logger.error('获取违约原因列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 根据ID获取违约原因
   * GET /api/v1/default-reasons/:id
   */
  getReasonById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return ResponseUtil.badRequest(res, '无效的ID');
      }

      const reason = await this.defaultReasonService.getDefaultReasonById(id);
      
      if (!reason) {
        return ResponseUtil.notFound(res, '违约原因不存在');
      }

      return ResponseUtil.success(res, reason, '查询成功');
    } catch (error: any) {
      logger.error('获取违约原因详情失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 创建违约原因
   * POST /api/v1/default-reasons
   */
  createReason = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const createdBy = req.user?.username || 'system'; // 从认证中间件获取用户信息

      const reason = await this.defaultReasonService.createDefaultReason(data, createdBy);
      
      return ResponseUtil.success(res, reason, '创建成功', 201);
    } catch (error: any) {
      logger.error('创建违约原因失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 更新违约原因
   * PUT /api/v1/default-reasons/:id
   */
  updateReason = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const updatedBy = req.user?.username || 'system';

      if (isNaN(id)) {
        return ResponseUtil.badRequest(res, '无效的ID');
      }

      const reason = await this.defaultReasonService.updateDefaultReason(id, data, updatedBy);
      
      if (!reason) {
        return ResponseUtil.notFound(res, '违约原因不存在');
      }

      return ResponseUtil.success(res, reason, '更新成功');
    } catch (error: any) {
      logger.error('更新违约原因失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 删除违约原因
   * DELETE /api/v1/default-reasons/:id
   */
  deleteReason = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return ResponseUtil.badRequest(res, '无效的ID');
      }

      const success = await this.defaultReasonService.deleteDefaultReason(id);
      
      if (!success) {
        return ResponseUtil.notFound(res, '违约原因不存在');
      }

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error: any) {
      logger.error('删除违约原因失败:', error);
      
      // 检查是否是外键约束错误
      if (error.code === 'P2003') {
        return ResponseUtil.badRequest(res, '该违约原因正在使用中，无法删除');
      }
      
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 获取启用的违约原因（用于下拉选择）
   * GET /api/v1/default-reasons/enabled
   */
  getEnabledReasons = async (req: Request, res: Response) => {
    try {
      const reasons = await this.defaultReasonService.getEnabledReasons();
      
      return ResponseUtil.success(res, reasons, '查询成功');
    } catch (error: any) {
      logger.error('获取启用违约原因失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 批量更新违约原因状态
   * POST /api/v1/default-reasons/batch-status
   */
  batchUpdateStatus = async (req: Request, res: Response) => {
    try {
      const { ids, enabled } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return ResponseUtil.badRequest(res, 'ids参数无效');
      }

      if (typeof enabled !== 'boolean') {
        return ResponseUtil.badRequest(res, 'enabled参数无效');
      }

      const count = await this.defaultReasonService.batchUpdateStatus(ids, enabled);
      
      return ResponseUtil.success(res, { count }, `批量更新成功，共更新${count}条记录`);
    } catch (error: any) {
      logger.error('批量更新违约原因状态失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };
}