import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';

export interface IndustryStatistics {
  industry: string;
  count: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface RegionStatistics {
  region: string;
  count: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface TrendPoint {
  year: number;
  defaultCount: number;
  renewalCount: number;
}

export interface StatisticsParams {
  year: number;
  type?: 'DEFAULT' | 'RENEWAL';
}

export interface TrendParams {
  dimension: 'INDUSTRY' | 'REGION';
  target: string;
  startYear: number;
  endYear: number;
}

export class StatisticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 获取按行业统计数据
   */
  async getIndustryStatistics(params: StatisticsParams) {
    try {
      const { year, type = 'DEFAULT' } = params;
      
      // 根据类型选择相应的表
      let query: any;
      if (type === 'DEFAULT') {
        // 统计违约客户按行业分布
        query = await this.prisma.defaultApplication.findMany({
          where: {
            status: 'APPROVED',
            approveTime: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          },
          include: {
            customer: true,
          },
        });
      } else {
        // 统计重生客户按行业分布
        query = await this.prisma.renewal.findMany({
          where: {
            status: 'APPROVED',
            approveTime: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          },
          include: {
            customer: true,
          },
        });
      }

      // 聚合行业数据
      const industryMap = new Map<string, number>();
      let total = 0;

      query.forEach((item: any) => {
        const industry = item.customer?.industry || '未分类';
        industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
        total++;
      });

      // 获取上一年数据以计算趋势
      const previousYear = year - 1;
      const previousYearData = await this.getPreviousYearData(previousYear, type);
      
      // 构建结果
      const industries: IndustryStatistics[] = [];
      industryMap.forEach((count, industry) => {
        const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
        const previousCount = previousYearData.get(industry) || 0;
        const trend = this.calculateTrend(count, previousCount);
        
        industries.push({
          industry,
          count,
          percentage,
          trend,
        });
      });

      // 按数量排序
      industries.sort((a, b) => b.count - a.count);

      return {
        year,
        type,
        total,
        industries,
      };
    } catch (error) {
      logger.error('获取行业统计数据失败:', error);
      throw new Error('获取行业统计数据失败');
    }
  }

  /**
   * 获取按区域统计数据
   */
  async getRegionStatistics(params: StatisticsParams) {
    try {
      const { year, type = 'DEFAULT' } = params;
      
      let query: any;
      if (type === 'DEFAULT') {
        query = await this.prisma.defaultApplication.findMany({
          where: {
            status: 'APPROVED',
            approveTime: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          },
          include: {
            customer: true,
          },
        });
      } else {
        query = await this.prisma.renewal.findMany({
          where: {
            status: 'APPROVED',
            approveTime: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          },
          include: {
            customer: true,
          },
        });
      }

      // 聚合区域数据
      const regionMap = new Map<string, number>();
      let total = 0;

      query.forEach((item: any) => {
        const region = item.customer?.region || '未分类';
        regionMap.set(region, (regionMap.get(region) || 0) + 1);
        total++;
      });

      // 获取上一年数据以计算趋势
      const previousYear = year - 1;
      const previousYearData = await this.getPreviousYearRegionData(previousYear, type);
      
      // 构建结果
      const regions: RegionStatistics[] = [];
      regionMap.forEach((count, region) => {
        const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
        const previousCount = previousYearData.get(region) || 0;
        const trend = this.calculateTrend(count, previousCount);
        
        regions.push({
          region,
          count,
          percentage,
          trend,
        });
      });

      // 按数量排序
      regions.sort((a, b) => b.count - a.count);

      return {
        year,
        type,
        total,
        regions,
      };
    } catch (error) {
      logger.error('获取区域统计数据失败:', error);
      throw new Error('获取区域统计数据失败');
    }
  }

  /**
   * 获取趋势分析数据
   */
  async getTrendStatistics(params: TrendParams) {
    try {
      const { dimension, target, startYear, endYear } = params;
      
      const trend: TrendPoint[] = [];
      
      for (let year = startYear; year <= endYear; year++) {
        // 获取该年度的违约和重生数据
        const defaultCount = await this.getYearlyCount(year, 'DEFAULT', dimension, target);
        const renewalCount = await this.getYearlyCount(year, 'RENEWAL', dimension, target);
        
        trend.push({
          year,
          defaultCount,
          renewalCount,
        });
      }

      return {
        dimension,
        target,
        trend,
      };
    } catch (error) {
      logger.error('获取趋势统计数据失败:', error);
      throw new Error('获取趋势统计数据失败');
    }
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStatistics(year: number) {
    try {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year + 1}-01-01`);

      // 并发查询各种统计数据
      const [
        totalDefaultApplications,
        pendingDefaultApplications,
        approvedDefaultApplications,
        rejectedDefaultApplications,
        totalRenewalApplications,
        pendingRenewalApplications,
        approvedRenewalApplications,
        rejectedRenewalApplications,
        totalDefaultCustomers,
        totalUsers,
        activeUsers,
      ] = await Promise.all([
        // 违约申请统计
        this.prisma.defaultApplication.count({
          where: {
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.defaultApplication.count({
          where: {
            status: 'PENDING',
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.defaultApplication.count({
          where: {
            status: 'APPROVED',
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.defaultApplication.count({
          where: {
            status: 'REJECTED',
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        // 重生申请统计
        this.prisma.renewal.count({
          where: {
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.renewal.count({
          where: {
            status: 'PENDING',
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.renewal.count({
          where: {
            status: 'APPROVED',
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        this.prisma.renewal.count({
          where: {
            status: 'REJECTED',
            createTime: { gte: startDate, lt: endDate },
          },
        }),
        // 违约客户统计
        this.prisma.customer.count({
          where: {
            status: 'DEFAULT',
          },
        }),
        // 用户统计
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            status: 'ACTIVE',
          },
        }),
      ]);

      return {
        year,
        defaultApplications: {
          total: totalDefaultApplications,
          pending: pendingDefaultApplications,
          approved: approvedDefaultApplications,
          rejected: rejectedDefaultApplications,
        },
        renewalApplications: {
          total: totalRenewalApplications,
          pending: pendingRenewalApplications,
          approved: approvedRenewalApplications,
          rejected: rejectedRenewalApplications,
        },
        customers: {
          totalDefault: totalDefaultCustomers,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
        },
      };
    } catch (error) {
      logger.error('获取概览统计数据失败:', error);
      throw new Error('获取概览统计数据失败');
    }
  }

  /**
   * 获取上一年行业数据
   */
  private async getPreviousYearData(year: number, type: 'DEFAULT' | 'RENEWAL') {
    const industryMap = new Map<string, number>();
    
    let query: any;
    if (type === 'DEFAULT') {
      query = await this.prisma.defaultApplication.findMany({
        where: {
          status: 'APPROVED',
          approveTime: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
        include: {
          customer: true,
        },
      });
    } else {
      query = await this.prisma.renewal.findMany({
        where: {
          status: 'APPROVED',
          approveTime: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
        include: {
          customer: true,
        },
      });
    }

    query.forEach((item: any) => {
      const industry = item.customer?.industry || '未分类';
      industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
    });

    return industryMap;
  }

  /**
   * 获取上一年区域数据
   */
  private async getPreviousYearRegionData(year: number, type: 'DEFAULT' | 'RENEWAL') {
    const regionMap = new Map<string, number>();
    
    let query: any;
    if (type === 'DEFAULT') {
      query = await this.prisma.defaultApplication.findMany({
        where: {
          status: 'APPROVED',
          approveTime: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
        include: {
          customer: true,
        },
      });
    } else {
      query = await this.prisma.renewal.findMany({
        where: {
          status: 'APPROVED',
          approveTime: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
        include: {
          customer: true,
        },
      });
    }

    query.forEach((item: any) => {
      const region = item.customer?.region || '未分类';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });

    return regionMap;
  }

  /**
   * 获取特定年度的统计数量
   */
  private async getYearlyCount(
    year: number,
    type: 'DEFAULT' | 'RENEWAL',
    dimension: 'INDUSTRY' | 'REGION',
    target: string,
  ): Promise<number> {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);
    
    const filterField = dimension === 'INDUSTRY' ? 'industry' : 'region';
    
    if (type === 'DEFAULT') {
      return await this.prisma.defaultApplication.count({
        where: {
          status: 'APPROVED',
          approveTime: { gte: startDate, lt: endDate },
          customer: {
            [filterField]: target,
          },
        },
      });
    } else {
      return await this.prisma.renewal.count({
        where: {
          status: 'APPROVED',
          approveTime: { gte: startDate, lt: endDate },
          customer: {
            [filterField]: target,
          },
        },
      });
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(current: number, previous: number): 'UP' | 'DOWN' | 'STABLE' {
    if (previous === 0) {
      return current > 0 ? 'UP' : 'STABLE';
    }
    
    const changePercentage = ((current - previous) / previous) * 100;
    
    if (changePercentage > 5) {
      return 'UP';
    } else if (changePercentage < -5) {
      return 'DOWN';
    } else {
      return 'STABLE';
    }
  }
}