import { Request, Response } from 'express';
import { RenewalService } from '../services/RenewalService';
import { ResponseUtil } from '../utils/response';
import logger from '../config/logger';

export class RenewalController {
  constructor(private renewalService: RenewalService) {}

  /**
   * 获取重生原因列表
   * GET /api/v1/renewal-reasons
   */
  getRenewalReasons = async (req: Request, res: Response) => {
    try {
      const reasons = await this.renewalService.getRenewalReasons();
      
      return ResponseUtil.success(res, reasons, '查询成功');
    } catch (error: any) {
      logger.error('获取重生原因列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 提交违约重生申请
   * POST /api/v1/renewals
   */
  createRenewal = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const applicant = req.user?.username || 'system';

      const renewal = await this.renewalService.createRenewal(data, applicant);
      
      return ResponseUtil.success(res, renewal, '重生申请提交成功', 201);
    } catch (error: any) {
      logger.error('创建重生申请失败:', error);
      
      // 处理业务逻辑错误
      if (error.message.includes('客户不存在') || error.message.includes('已有待审核')) {
        return ResponseUtil.badRequest(res, error.message);
      }
      
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 审核违约重生申请
   * POST /api/v1/renewals/:renewalId/approve
   */
  approveRenewal = async (req: Request, res: Response) => {
    try {
      const { renewalId } = req.params;
      const data = req.body;
      const approver = req.user?.username || 'system';

      const success = await this.renewalService.approveRenewal(renewalId, data, approver);
      
      if (!success) {
        return ResponseUtil.notFound(res, '重生申请不存在');
      }

      const responseData = {
        renewalId,
        status: data.approved ? 'APPROVED' : 'REJECTED',
        approver,
        approveTime: new Date().toISOString(),
      };

      return ResponseUtil.success(res, responseData, '审核成功');
    } catch (error: any) {
      logger.error('审核重生申请失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 查询重生申请列表
   * GET /api/v1/renewals
   */
  getRenewals = async (req: Request, res: Response) => {
    try {
      const { page = 1, size = 10, status, customerName, applicant } = req.query as any;
      const user = req.user;
      
      const result = await this.renewalService.getRenewals(
        parseInt(page),
        parseInt(size),
        status,
        customerName,
        applicant,
        user?.role,
        user?.username,
      );
      
      return ResponseUtil.success(res, result, '查询成功');
    } catch (error: any) {
      logger.error('获取重生申请列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 获取重生申请详情
   * GET /api/v1/renewals/:renewalId
   */
  getRenewalDetail = async (req: Request, res: Response) => {
    try {
      const { renewalId } = req.params;
      const user = req.user;
      
      const renewal = await this.renewalService.getRenewalDetail(
        renewalId,
        user?.role,
        user?.username
      );
      
      if (!renewal) {
        return ResponseUtil.notFound(res, '重生申请不存在');
      }

      return ResponseUtil.success(res, renewal, '查询成功');
    } catch (error: any) {
      logger.error('获取重生申请详情失败:', error);
      
      // 处理权限错误
      if (error.message.includes('无权限')) {
        return ResponseUtil.forbidden(res, error.message);
      }
      
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 批量审核重生申请
   * POST /api/v1/renewals/batch-approve
   */
  batchApproveRenewals = async (req: Request, res: Response) => {
    try {
      const { renewals } = req.body;
      const approver = req.user?.username || 'system';

      const result = await this.renewalService.batchApproveRenewals(renewals, approver);
      
      return ResponseUtil.success(res, result, '批量审核完成');
    } catch (error: any) {
      logger.error('批量审核重生申请失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };
}