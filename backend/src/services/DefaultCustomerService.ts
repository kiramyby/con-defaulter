import { PrismaClient } from '@prisma/client';
import { 
  DefaultCustomerDto,
  PaginatedResponse,
  DefaultCustomerQueryParams,
} from '../types/api';
import logger from '../config/logger';

export class DefaultCustomerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 查询违约客户列表
   */
  async getDefaultCustomers(params: DefaultCustomerQueryParams & { dataAccess?: any }): Promise<PaginatedResponse<DefaultCustomerDto>> {
    const { page = 1, size = 10, customerName, severity, startTime, endTime, dataAccess } = params;
    const skip = (page - 1) * size;

    const where: any = {
      isActive: true,
    };
    
    if (customerName) where.customerName = { contains: customerName, mode: 'insensitive' };
    if (severity) where.severity = severity;
    if (startTime || endTime) {
      where.applicationTime = {};
      if (startTime) where.applicationTime.gte = new Date(startTime);
      if (endTime) where.applicationTime.lte = new Date(endTime);
    }

    // 应用数据级别权限控制
    if (dataAccess && dataAccess.checkOwnership) {
      if (dataAccess.role === 'OPERATOR') {
        // 操作员只能查看自己申请的违约客户
        where.applicant = dataAccess.username;
      }
    }

    const [total, customers] = await Promise.all([
      this.prisma.defaultCustomer.count({ where }),
      this.prisma.defaultCustomer.findMany({
        where,
        include: {
          defaultReasons: {
            include: { defaultReason: true },
          },
        },
        orderBy: { approveTime: 'desc' },
        skip,
        take: size,
      }),
    ]);

    logger.info(`查询违约客户列表: total=${total}, page=${page}, size=${size}`);

    return {
      total,
      page,
      size,
      list: customers.map(customer => ({
        customerId: Number(customer.customerId),
        customerName: customer.customerName,
        status: 'DEFAULT' as const,
        defaultReasons: customer.defaultReasons.map(r => Number(r.defaultReasonId)),
        severity: customer.severity,
        applicant: customer.applicant,
        applicationTime: customer.applicationTime.toISOString(),
        approveTime: customer.approveTime.toISOString(),
        latestExternalRating: customer.latestExternalRating || undefined,
      })),
    };
  }

  /**
   * 导出违约客户列表
   * 返回用于导出Excel的数据
   */
  async exportDefaultCustomers(params: DefaultCustomerQueryParams & { dataAccess?: any }): Promise<Array<{
    客户ID: number;
    客户名称: string;
    状态: string;
    违约原因: string;
    严重程度: string;
    申请人: string;
    申请时间: string;
    审核时间: string;
    最新外部评级: string;
  }>> {
    const { dataAccess } = params;
    const where: any = {
      isActive: true,
    };
    
    if (params.customerName) where.customerName = { contains: params.customerName, mode: 'insensitive' };
    if (params.severity) where.severity = params.severity;
    if (params.startTime || params.endTime) {
      where.applicationTime = {};
      if (params.startTime) where.applicationTime.gte = new Date(params.startTime);
      if (params.endTime) where.applicationTime.lte = new Date(params.endTime);
    }

    // 应用数据级别权限控制
    if (dataAccess && dataAccess.checkOwnership) {
      if (dataAccess.role === 'OPERATOR') {
        // 操作员只能导出自己申请的违约客户
        where.applicant = dataAccess.username;
      }
    }

    const customers = await this.prisma.defaultCustomer.findMany({
      where,
      include: {
        defaultReasons: {
          include: { defaultReason: true },
        },
      },
      orderBy: { approveTime: 'desc' },
    });

    logger.info(`导出违约客户列表: count=${customers.length}`);

    return customers.map(customer => ({
      客户ID: Number(customer.customerId),
      客户名称: customer.customerName,
      状态: '违约',
      违约原因: customer.defaultReasons.map(r => r.defaultReason.reason).join(', '),
      严重程度: customer.severity === 'HIGH' ? '高' : customer.severity === 'MEDIUM' ? '中' : '低',
      申请人: customer.applicant,
      申请时间: customer.applicationTime.toISOString().split('T')[0],
      审核时间: customer.approveTime.toISOString().split('T')[0],
      最新外部评级: customer.latestExternalRating || '',
    }));
  }

  /**
   * 根据客户ID获取违约详情
   */
  async getDefaultCustomerByCustomerId(customerId: number, dataAccess?: any): Promise<DefaultCustomerDto | null> {
    const where: any = {
      customerId: BigInt(customerId),
      isActive: true,
    };

    // 应用数据级别权限控制
    if (dataAccess && dataAccess.checkOwnership) {
      if (dataAccess.role === 'OPERATOR') {
        // 操作员只能查看自己申请的违约客户
        where.applicant = dataAccess.username;
      }
    }

    const customer = await this.prisma.defaultCustomer.findFirst({
      where,
      include: {
        defaultReasons: {
          include: { defaultReason: true },
        },
      },
    });

    if (!customer) {
      return null;
    }

    return {
      customerId: Number(customer.customerId),
      customerName: customer.customerName,
      status: 'DEFAULT',
      defaultReasons: customer.defaultReasons.map(r => Number(r.defaultReasonId)),
      severity: customer.severity,
      applicant: customer.applicant,
      applicationTime: customer.applicationTime.toISOString(),
      approveTime: customer.approveTime.toISOString(),
      latestExternalRating: customer.latestExternalRating || undefined,
    };
  }

  /**
   * 获取可重生客户列表（未有待审核重生申请的违约客户）
   */
  async getRenewableCustomers(page: number = 1, size: number = 10, customerName?: string) {
    const skip = (page - 1) * size;

    const where: any = {
      isActive: true,
      customer: {
        renewals: {
          none: {
            status: 'PENDING',
          },
        },
      },
    };

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }

    const [total, customers] = await Promise.all([
      this.prisma.defaultCustomer.count({ where }),
      this.prisma.defaultCustomer.findMany({
        where,
        include: {
          defaultReasons: {
            include: { defaultReason: true },
          },
        },
        orderBy: { approveTime: 'desc' },
        skip,
        take: size,
      }),
    ]);

    logger.info(`查询可重生客户列表: total=${total}, page=${page}, size=${size}`);

    return {
      total,
      page,
      size,
      list: customers.map(customer => ({
        customerId: Number(customer.customerId),
        customerName: customer.customerName,
        defaultReasons: customer.defaultReasons.map(r => Number(r.defaultReasonId)),
        severity: customer.severity,
        applicant: customer.applicant,
        applicationTime: customer.applicationTime.toISOString(),
        approveTime: customer.approveTime.toISOString(),
        latestExternalRating: customer.latestExternalRating,
      })),
    };
  }
}