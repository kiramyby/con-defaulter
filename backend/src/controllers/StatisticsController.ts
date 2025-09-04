import { Request, Response } from 'express';
import '../types/express';
import { PrismaClient } from '@prisma/client';
import { StatisticsService } from '../services/StatisticsService';
import { ResponseUtil } from '../utils/response';
import logger from '../config/logger';

export class StatisticsController {
  private prisma: PrismaClient;
  private statisticsService: StatisticsService;

  constructor() {
    this.prisma = new PrismaClient();
    this.statisticsService = new StatisticsService(this.prisma);
  }

  /**
   * 获取按行业统计数据
   * GET /api/v1/statistics/by-industry
   */
  getStatisticsByIndustry = async (req: Request, res: Response) => {
    try {
      const { year = new Date().getFullYear(), type = 'DEFAULT' } = req.query;

      const yearNum = Number(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
        return ResponseUtil.badRequest(res, '年份参数无效');
      }

      if (type !== 'DEFAULT' && type !== 'RENEWAL') {
        return ResponseUtil.badRequest(res, '统计类型参数无效');
      }

      const result = await this.statisticsService.getIndustryStatistics({
        year: yearNum,
        type: type as 'DEFAULT' | 'RENEWAL',
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'READ',
          businessType: 'STATISTICS',
          operationDesc: `查询${year}年${type === 'DEFAULT' ? '违约' : '重生'}行业统计`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`查询行业统计: ${req.user?.username} - ${year}年 ${type}`);

      return ResponseUtil.success(res, result, '获取行业统计数据成功');
    } catch (error: any) {
      logger.error('获取行业统计数据失败:', error);
      return ResponseUtil.internalError(res, error.message || '获取行业统计数据失败');
    }
  };

  /**
   * 获取按区域统计数据
   * GET /api/v1/statistics/by-region
   */
  getStatisticsByRegion = async (req: Request, res: Response) => {
    try {
      const { year = new Date().getFullYear(), type = 'DEFAULT' } = req.query;

      const yearNum = Number(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
        return ResponseUtil.badRequest(res, '年份参数无效');
      }

      if (type !== 'DEFAULT' && type !== 'RENEWAL') {
        return ResponseUtil.badRequest(res, '统计类型参数无效');
      }

      const result = await this.statisticsService.getRegionStatistics({
        year: yearNum,
        type: type as 'DEFAULT' | 'RENEWAL',
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'READ',
          businessType: 'STATISTICS',
          operationDesc: `查询${year}年${type === 'DEFAULT' ? '违约' : '重生'}区域统计`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`查询区域统计: ${req.user?.username} - ${year}年 ${type}`);

      return ResponseUtil.success(res, result, '获取区域统计数据成功');
    } catch (error: any) {
      logger.error('获取区域统计数据失败:', error);
      return ResponseUtil.internalError(res, error.message || '获取区域统计数据失败');
    }
  };

  /**
   * 获取趋势分析数据
   * GET /api/v1/statistics/trend
   */
  getTrendStatistics = async (req: Request, res: Response) => {
    try {
      const {
        dimension = 'INDUSTRY',
        target,
        startYear = new Date().getFullYear() - 4,
        endYear = new Date().getFullYear(),
      } = req.query;

      if (dimension !== 'INDUSTRY' && dimension !== 'REGION') {
        return ResponseUtil.badRequest(res, '分析维度参数无效');
      }

      if (!target) {
        return ResponseUtil.badRequest(res, '目标参数不能为空');
      }

      const startYearNum = Number(startYear);
      const endYearNum = Number(endYear);

      if (isNaN(startYearNum) || isNaN(endYearNum) || startYearNum > endYearNum) {
        return ResponseUtil.badRequest(res, '年份参数无效');
      }

      if (endYearNum - startYearNum > 10) {
        return ResponseUtil.badRequest(res, '时间范围不能超过10年');
      }

      const result = await this.statisticsService.getTrendStatistics({
        dimension: dimension as 'INDUSTRY' | 'REGION',
        target: target as string,
        startYear: startYearNum,
        endYear: endYearNum,
      });

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'READ',
          businessType: 'STATISTICS',
          operationDesc: `查询趋势分析: ${dimension}-${target} (${startYear}-${endYear})`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`查询趋势分析: ${req.user?.username} - ${dimension}:${target} (${startYear}-${endYear})`);

      return ResponseUtil.success(res, result, '获取趋势分析数据成功');
    } catch (error: any) {
      logger.error('获取趋势分析数据失败:', error);
      return ResponseUtil.internalError(res, error.message || '获取趋势分析数据失败');
    }
  };

  /**
   * 获取概览统计数据
   * GET /api/v1/statistics/overview
   */
  getOverviewStatistics = async (req: Request, res: Response) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const yearNum = Number(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
        return ResponseUtil.badRequest(res, '年份参数无效');
      }

      const result = await this.statisticsService.getOverviewStatistics(yearNum);

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'READ',
          businessType: 'STATISTICS',
          operationDesc: `查询${year}年概览统计`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`查询概览统计: ${req.user?.username} - ${year}年`);

      return ResponseUtil.success(res, result, '获取概览统计数据成功');
    } catch (error: any) {
      logger.error('获取概览统计数据失败:', error);
      return ResponseUtil.internalError(res, error.message || '获取概览统计数据失败');
    }
  };

  /**
   * 获取可用的行业列表
   * GET /api/v1/statistics/industries
   */
  getAvailableIndustries = async (req: Request, res: Response) => {
    try {
      const industries = await this.prisma.customer.findMany({
        select: {
          industry: true,
        },
        distinct: ['industry'],
        where: {
          industry: {
            not: null,
          },
        },
      });

      const result = industries
        .map(item => item.industry)
        .filter(Boolean)
        .sort();

      logger.info(`查询可用行业列表: ${req.user?.username}`);

      return ResponseUtil.success(res, result, '获取行业列表成功');
    } catch (error: any) {
      logger.error('获取行业列表失败:', error);
      return ResponseUtil.internalError(res, '获取行业列表失败');
    }
  };

  /**
   * 获取可用的区域列表
   * GET /api/v1/statistics/regions
   */
  getAvailableRegions = async (req: Request, res: Response) => {
    try {
      const regions = await this.prisma.customer.findMany({
        select: {
          region: true,
        },
        distinct: ['region'],
        where: {
          region: {
            not: null,
          },
        },
      });

      const result = regions
        .map(item => item.region)
        .filter(Boolean)
        .sort();

      logger.info(`查询可用区域列表: ${req.user?.username}`);

      return ResponseUtil.success(res, result, '获取区域列表成功');
    } catch (error: any) {
      logger.error('获取区域列表失败:', error);
      return ResponseUtil.internalError(res, '获取区域列表失败');
    }
  };

  /**
   * 导出统计报告
   * GET /api/v1/statistics/export
   */
  exportStatisticsReport = async (req: Request, res: Response) => {
    try {
      const { 
        year = new Date().getFullYear(), 
        type = 'DEFAULT',
        format = 'excel' 
      } = req.query;

      const yearNum = Number(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
        return ResponseUtil.badRequest(res, '年份参数无效');
      }

      if (type !== 'DEFAULT' && type !== 'RENEWAL') {
        return ResponseUtil.badRequest(res, '统计类型参数无效');
      }

      // 获取统计数据
      const [industryStats, regionStats, overviewStats] = await Promise.all([
        this.statisticsService.getIndustryStatistics({
          year: yearNum,
          type: type as 'DEFAULT' | 'RENEWAL',
        }),
        this.statisticsService.getRegionStatistics({
          year: yearNum,
          type: type as 'DEFAULT' | 'RENEWAL',
        }),
        this.statisticsService.getOverviewStatistics(yearNum),
      ]);

      // 构建导出数据
      const exportData = {
        overview: overviewStats,
        industry: industryStats,
        region: regionStats,
        exportTime: new Date().toISOString(),
        year: yearNum,
        type,
      };

      // 记录操作日志
      await this.prisma.operationLog.create({
        data: {
          username: req.user?.username || 'system',
          operationType: 'EXPORT',
          businessType: 'STATISTICS',
          operationDesc: `导出${year}年${type === 'DEFAULT' ? '违约' : '重生'}统计报告`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`导出统计报告: ${req.user?.username} - ${year}年 ${type}`);

      // 设置响应头
      const filename = `统计报告_${year}年_${type === 'DEFAULT' ? '违约' : '重生'}_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', 'application/json');

      return ResponseUtil.success(res, exportData, '导出统计报告成功');
    } catch (error: any) {
      logger.error('导出统计报告失败:', error);
      return ResponseUtil.internalError(res, error.message || '导出统计报告失败');
    }
  };
}