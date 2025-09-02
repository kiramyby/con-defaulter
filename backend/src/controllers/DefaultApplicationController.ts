import { Request, Response } from 'express';
import { DefaultApplicationService } from '../services/DefaultApplicationService';
import { ResponseUtil } from '../utils/response';
import logger from '../config/logger';

export class DefaultApplicationController {
  constructor(private applicationService: DefaultApplicationService) {}

  /**
   * 提交违约认定申请
   * POST /api/v1/default-applications
   */
  createApplication = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const applicant = req.user?.username || 'system';

      const application = await this.applicationService.createApplication(data, applicant);
      
      return ResponseUtil.success(res, application, '申请提交成功', 201);
    } catch (error: any) {
      logger.error('创建违约申请失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 查询违约认定申请列表
   * GET /api/v1/default-applications
   */
  getApplications = async (req: Request, res: Response) => {
    try {
      const params = req.query as any;
      
      // 应用数据级别权限控制
      const dataAccess = req.checkDataAccess;
      if (dataAccess) {
        params.dataAccess = dataAccess;
      }
      
      const result = await this.applicationService.getApplications(params);
      
      return ResponseUtil.success(res, result, '查询成功');
    } catch (error: any) {
      logger.error('获取违约申请列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 获取违约认定申请详情
   * GET /api/v1/default-applications/:applicationId
   */
  getApplicationDetail = async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;
      
      // 应用数据级别权限控制
      const dataAccess = req.checkDataAccess;
      const application = await this.applicationService.getApplicationDetail(applicationId, dataAccess);
      
      if (!application) {
        return ResponseUtil.notFound(res, '申请不存在或无权限访问');
      }

      return ResponseUtil.success(res, application, '查询成功');
    } catch (error: any) {
      logger.error('获取违约申请详情失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 审核违约认定申请
   * POST /api/v1/default-applications/:applicationId/approve
   */
  approveApplication = async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;
      const data = req.body;
      const approver = req.user?.username || 'system';

      const success = await this.applicationService.approveApplication(applicationId, data, approver);
      
      if (!success) {
        return ResponseUtil.notFound(res, '申请不存在');
      }

      const responseData = {
        applicationId,
        status: data.approved ? 'APPROVED' : 'REJECTED',
        approver,
        approveTime: new Date().toISOString(),
      };

      return ResponseUtil.success(res, responseData, '审核成功');
    } catch (error: any) {
      logger.error('审核违约申请失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 批量审核违约认定申请
   * POST /api/v1/default-applications/batch-approve
   */
  batchApprove = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const approver = req.user?.username || 'system';

      const result = await this.applicationService.batchApprove(data, approver);
      
      return ResponseUtil.success(res, result, '批量审核完成');
    } catch (error: any) {
      logger.error('批量审核违约申请失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };
}