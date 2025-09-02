import { Request, Response } from 'express';
import { DefaultCustomerService } from '../services/DefaultCustomerService';
import { ResponseUtil } from '../utils/response';
import logger from '../config/logger';

export class DefaultCustomerController {
  constructor(private customerService: DefaultCustomerService) {}

  /**
   * 查询违约客户列表
   * GET /api/v1/default-customers
   */
  getDefaultCustomers = async (req: Request, res: Response) => {
    try {
      const params = req.query as any;
      
      // 应用数据级别权限控制
      const dataAccess = req.checkDataAccess;
      if (dataAccess) {
        params.dataAccess = dataAccess;
      }
      
      const result = await this.customerService.getDefaultCustomers(params);
      
      return ResponseUtil.success(res, result, '查询成功');
    } catch (error: any) {
      logger.error('获取违约客户列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 导出违约客户列表
   * GET /api/v1/default-customers/export
   */
  exportDefaultCustomers = async (req: Request, res: Response) => {
    try {
      const params = req.query as any;
      
      const data = await this.customerService.exportDefaultCustomers(params);
      
      // 设置响应头为Excel格式
      const filename = `违约客户列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      // 这里应该使用Excel库（如 xlsx）来生成实际的Excel文件
      // 为了简化，这里直接返回JSON数据
      return ResponseUtil.success(res, data, '导出成功');
    } catch (error: any) {
      logger.error('导出违约客户列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 根据客户ID获取违约详情
   * GET /api/v1/default-customers/:customerId
   */
  getDefaultCustomerByCustomerId = async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      
      if (isNaN(customerId)) {
        return ResponseUtil.badRequest(res, '无效的客户ID');
      }

      // 应用数据级别权限控制
      const dataAccess = req.checkDataAccess;
      const customer = await this.customerService.getDefaultCustomerByCustomerId(customerId, dataAccess);
      
      if (!customer) {
        return ResponseUtil.notFound(res, '违约客户不存在或无权限访问');
      }

      return ResponseUtil.success(res, customer, '查询成功');
    } catch (error: any) {
      logger.error('获取违约客户详情失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };

  /**
   * 查询可重生客户列表
   * GET /api/v1/default-customers/renewable
   */
  getRenewableCustomers = async (req: Request, res: Response) => {
    try {
      const { page = 1, size = 10, customerName } = req.query as any;
      
      const result = await this.customerService.getRenewableCustomers(
        parseInt(page),
        parseInt(size),
        customerName,
      );
      
      return ResponseUtil.success(res, result, '查询成功');
    } catch (error: any) {
      logger.error('获取可重生客户列表失败:', error);
      return ResponseUtil.internalError(res, error.message);
    }
  };
}