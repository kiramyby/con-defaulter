import { PrismaClient, RenewalStatus, CustomerStatus } from '@prisma/client';
import { 
  RenewalDto,
  CreateRenewalDto,
  RenewalReasonDto,
  ApproveRenewalDto,
} from '../types/api';
import logger from '../config/logger';

export class RenewalService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 获取重生原因列表
   */
  async getRenewalReasons(): Promise<RenewalReasonDto[]> {
    const reasons = await this.prisma.renewalReason.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        reason: true,
        enabled: true,
      },
    });

    return reasons.map(r => ({
      id: Number(r.id),
      reason: r.reason,
      enabled: r.enabled,
    }));
  }

  /**
   * 提交违约重生申请
   */
  async createRenewal(data: CreateRenewalDto, applicant: string): Promise<RenewalDto> {
    const renewalId = `REN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    return await this.prisma.$transaction(async (tx) => {
      // 验证客户是否存在且为违约状态
      const defaultCustomer = await tx.defaultCustomer.findFirst({
        where: {
          customerId: BigInt(data.customerId),
          isActive: true,
        },
        include: { customer: true },
      });

      if (!defaultCustomer) {
        throw new Error('客户不存在或不是违约状态');
      }

      // 检查是否已有待审核的重生申请
      const existingRenewal = await tx.renewal.findFirst({
        where: {
          customerId: BigInt(data.customerId),
          status: RenewalStatus.PENDING,
        },
      });

      if (existingRenewal) {
        throw new Error('该客户已有待审核的重生申请');
      }

      // 创建重生申请
      const renewal = await tx.renewal.create({
        data: {
          renewalId,
          customerId: BigInt(data.customerId),
          customerName: defaultCustomer.customerName,
          renewalReasonId: BigInt(data.renewalReason),
          status: RenewalStatus.PENDING,
          remark: data.remark,
          applicant,
        },
      });

      logger.info(`创建重生申请: id=${renewalId}, customerId=${data.customerId}, applicant=${applicant}`);

      return {
        renewalId,
        customerId: data.customerId,
        customerName: defaultCustomer.customerName,
        status: 'PENDING',
        createTime: renewal.createTime.toISOString(),
      };
    });
  }

  /**
   * 审核违约重生申请
   */
  async approveRenewal(
    renewalId: string,
    data: ApproveRenewalDto,
    approver: string,
  ): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      const renewal = await tx.renewal.findUnique({
        where: { renewalId },
      });

      if (!renewal) {
        return false;
      }

      // 更新申请状态
      await tx.renewal.update({
        where: { renewalId },
        data: {
          status: data.approved ? RenewalStatus.APPROVED : RenewalStatus.REJECTED,
          approver,
          approveTime: new Date(),
          approveRemark: data.remark,
        },
      });

      // 如果审核通过，处理重生逻辑
      if (data.approved) {
        // 将违约客户记录设为无效
        await tx.defaultCustomer.updateMany({
          where: { customerId: renewal.customerId },
          data: { isActive: false },
        });

        // 更新客户状态为正常
        await tx.customer.update({
          where: { id: renewal.customerId },
          data: { status: CustomerStatus.NORMAL },
        });

        logger.info(`重生申请审核通过: renewalId=${renewalId}, customerId=${renewal.customerId}`);
      }

      logger.info(`审核重生申请: renewalId=${renewalId}, approved=${data.approved}, approver=${approver}`);
      return true;
    });
  }

  /**
   * 查询重生申请列表
   */
  async getRenewals(
    page: number = 1,
    size: number = 10,
    status?: RenewalStatus,
    customerName?: string,
  ) {
    const skip = (page - 1) * size;

    const where: any = {};
    
    if (status) where.status = status;
    if (customerName) where.customerName = { contains: customerName, mode: 'insensitive' };

    const [total, renewals] = await Promise.all([
      this.prisma.renewal.count({ where }),
      this.prisma.renewal.findMany({
        where,
        include: {
          renewalReason: true,
        },
        orderBy: { createTime: 'desc' },
        skip,
        take: size,
      }),
    ]);

    return {
      total,
      page,
      size,
      list: renewals.map(renewal => ({
        renewalId: renewal.renewalId,
        customerId: Number(renewal.customerId),
        customerName: renewal.customerName,
        renewalReason: renewal.renewalReason.reason,
        status: renewal.status,
        remark: renewal.remark,
        applicant: renewal.applicant,
        createTime: renewal.createTime.toISOString(),
        approver: renewal.approver,
        approveTime: renewal.approveTime?.toISOString(),
        approveRemark: renewal.approveRemark,
      })),
    };
  }

  /**
   * 获取重生申请详情
   */
  async getRenewalDetail(renewalId: string) {
    const renewal = await this.prisma.renewal.findUnique({
      where: { renewalId },
      include: {
        renewalReason: true,
        customer: true,
      },
    });

    if (!renewal) {
      return null;
    }

    return {
      renewalId: renewal.renewalId,
      customerId: Number(renewal.customerId),
      customerName: renewal.customerName,
      renewalReason: {
        id: Number(renewal.renewalReason.id),
        reason: renewal.renewalReason.reason,
      },
      status: renewal.status,
      remark: renewal.remark,
      applicant: renewal.applicant,
      createTime: renewal.createTime.toISOString(),
      approver: renewal.approver,
      approveTime: renewal.approveTime?.toISOString(),
      approveRemark: renewal.approveRemark,
    };
  }
}