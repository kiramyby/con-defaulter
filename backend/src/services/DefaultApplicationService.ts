import { PrismaClient, ApplicationStatus, CustomerStatus } from '@prisma/client';
import { 
  DefaultApplicationDto, 
  CreateDefaultApplicationDto, 
  DefaultApplicationDetailDto,
  ApproveApplicationDto,
  BatchApproveDto,
  PaginatedResponse,
  ApplicationQueryParams,
} from '../types/api';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class DefaultApplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 创建违约认定申请
   */
  async createApplication(
    data: CreateDefaultApplicationDto,
    applicant: string,
  ): Promise<DefaultApplicationDto> {
    const applicationId = `APP${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    return await this.prisma.$transaction(async (tx) => {
      // 1. 查找或创建客户
      let customer = await tx.customer.findFirst({
        where: { customerName: data.customerName },
      });

      if (!customer) {
        // 生成客户编码
        const customerCode = await this.generateCustomerCode(tx);
        customer = await tx.customer.create({
          data: {
            customerCode,
            customerName: data.customerName,
            latestExternalRating: data.latestExternalRating,
          },
        });
        logger.info(`创建新客户: id=${customer.id}, name=${data.customerName}`);
      }

      // 2. 创建申请记录
      const application = await tx.defaultApplication.create({
        data: {
          applicationId,
          customerId: customer.id,
          customerName: data.customerName,
          latestExternalRating: data.latestExternalRating,
          severity: data.severity,
          status: ApplicationStatus.PENDING,
          remark: data.remark,
          applicant,
        },
        include: {
          defaultReasons: {
            include: { defaultReason: true },
          },
        },
      });

      // 3. 关联违约原因
      await tx.applicationDefaultReason.createMany({
        data: data.defaultReasons.map(reasonId => ({
          applicationId: application.id,
          defaultReasonId: BigInt(reasonId),
        })),
      });

      // 4. 处理附件
      if (data.attachments && data.attachments.length > 0) {
        await tx.attachment.createMany({
          data: data.attachments.map(att => ({
            fileId: uuidv4(),
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: BigInt(att.fileSize),
            businessType: 'DEFAULT_APPLICATION',
            businessId: application.id,
            uploadedBy: applicant,
          })),
        });
      }

      logger.info(`创建违约申请: id=${applicationId}, customer=${data.customerName}, applicant=${applicant}`);

      return {
        applicationId,
        customerId: Number(customer.id),
        customerName: data.customerName,
        applicant,
        status: 'PENDING' as const,
        severity: data.severity,
        defaultReasons: data.defaultReasons,
        createTime: application.createTime.toISOString(),
        latestExternalRating: data.latestExternalRating,
      };
    });
  }

  /**
   * 查询违约认定申请列表
   */
  async getApplications(params: ApplicationQueryParams & { dataAccess?: any }): Promise<PaginatedResponse<DefaultApplicationDto>> {
    // 确保分页参数为数字类型（URL查询参数默认为字符串）
    const page = Number(params.page) || 1;
    const size = Number(params.size) || 10;
    const { status, customerName, applicant, severity, startTime, endTime, dataAccess } = params;
    const skip = (page - 1) * size;

    const where: any = {};
    
    if (status) where.status = status;
    if (customerName) where.customerName = { contains: customerName, mode: 'insensitive' };
    if (applicant) where.applicant = applicant;
    if (severity) where.severity = severity;
    if (startTime || endTime) {
      where.createTime = {};
      if (startTime) where.createTime.gte = new Date(startTime);
      if (endTime) where.createTime.lte = new Date(endTime);
    }

    // 应用数据级别权限控制
    if (dataAccess && dataAccess.checkOwnership) {
      if (dataAccess.role === 'OPERATOR') {
        // 操作员只能查看自己提交的申请
        where.applicant = dataAccess.username;
      }
      // AUDITOR 可以查看所有申请，但不能修改
      // ADMIN 可以查看和操作所有申请
    }

    const [total, applications] = await Promise.all([
      this.prisma.defaultApplication.count({ where }),
      this.prisma.defaultApplication.findMany({
        where,
        include: {
          defaultReasons: {
            include: { defaultReason: true },
          },
        },
        orderBy: { createTime: 'desc' },
        skip,
        take: size,
      }),
    ]);

    logger.info(`查询违约申请列表: total=${total}, page=${page}, size=${size}`);

    return {
      total,
      page,
      size,
      list: applications.map(app => ({
        applicationId: app.applicationId,
        customerId: Number(app.customerId),
        customerName: app.customerName,
        applicant: app.applicant,
        status: app.status,
        severity: app.severity,
        defaultReasons: app.defaultReasons.map(r => Number(r.defaultReasonId)),
        createTime: app.createTime.toISOString(),
        latestExternalRating: app.latestExternalRating || undefined,
      })),
    };
  }

  /**
   * 获取违约认定申请详情
   */
  async getApplicationDetail(applicationId: string, dataAccess?: any): Promise<DefaultApplicationDetailDto | null> {
    const where: any = { applicationId };
    
    // 应用数据级别权限控制
    if (dataAccess && dataAccess.checkOwnership) {
      if (dataAccess.role === 'OPERATOR') {
        // 操作员只能查看自己提交的申请
        where.applicant = dataAccess.username;
      }
    }

    const application = await this.prisma.defaultApplication.findFirst({
      where,
      include: {
        defaultReasons: {
          include: { defaultReason: true },
        },
      },
    });

    if (!application) {
      return null;
    }

    // 获取附件
    const attachments = await this.prisma.attachment.findMany({
      where: {
        businessType: 'DEFAULT_APPLICATION',
        businessId: application.id,
      },
      select: {
        fileName: true,
        fileUrl: true,
        fileSize: true,
      },
    });

    return {
      applicationId: application.applicationId,
      customerId: Number(application.customerId),
      customerName: application.customerName,
      latestExternalRating: application.latestExternalRating || undefined,
      defaultReasons: application.defaultReasons.map(r => Number(r.defaultReasonId)),
      severity: application.severity,
      remark: application.remark || undefined,
      attachments: attachments.map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: Number(att.fileSize),
      })),
      applicant: application.applicant,
      status: application.status,
      createTime: application.createTime.toISOString(),
      approveTime: application.approveTime?.toISOString(),
      approver: application.approver || undefined,
      approveRemark: application.approveRemark || undefined,
    };
  }

  /**
   * 审核违约认定申请
   */
  async approveApplication(
    applicationId: string,
    data: ApproveApplicationDto,
    approver: string,
  ): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      const application = await tx.defaultApplication.findUnique({
        where: { applicationId },
        include: { defaultReasons: true },
      });

      if (!application) {
        return false;
      }

      // 更新申请状态
      await tx.defaultApplication.update({
        where: { applicationId },
        data: {
          status: data.approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
          approver,
          approveTime: new Date(),
          approveRemark: data.remark,
        },
      });

      // 如果审核通过，创建违约客户记录
      if (data.approved) {
        const defaultCustomer = await tx.defaultCustomer.create({
          data: {
            customerId: application.customerId,
            applicationId: application.id,
            customerName: application.customerName,
            severity: application.severity,
            applicant: application.applicant,
            applicationTime: application.createTime,
            approver,
            approveTime: new Date(),
            latestExternalRating: application.latestExternalRating || undefined,
            isActive: true,
          },
        });

        // 创建违约客户原因关联
        await tx.defaultCustomerReason.createMany({
          data: application.defaultReasons.map(r => ({
            defaultCustomerId: defaultCustomer.id,
            defaultReasonId: r.defaultReasonId,
          })),
        });

        // 更新客户状态为违约
        await tx.customer.update({
          where: { id: application.customerId },
          data: { status: CustomerStatus.DEFAULT },
        });

        logger.info(`违约申请审核通过，创建违约客户记录: applicationId=${applicationId}, customerId=${application.customerId}`);
      }

      logger.info(`审核违约申请: applicationId=${applicationId}, approved=${data.approved}, approver=${approver}`);
      return true;
    });
  }

  /**
   * 批量审核违约认定申请
   */
  async batchApprove(data: BatchApproveDto, approver: string): Promise<{
    successCount: number;
    failCount: number;
    details: Array<{ applicationId: string; success: boolean; message: string }>;
  }> {
    const results = {
      successCount: 0,
      failCount: 0,
      details: [] as Array<{ applicationId: string; success: boolean; message: string }>,
    };

    for (const item of data.applications) {
      try {
        const success = await this.approveApplication(
          item.applicationId,
          { approved: item.approved, remark: item.remark },
          approver,
        );

        if (success) {
          results.successCount++;
          results.details.push({
            applicationId: item.applicationId,
            success: true,
            message: '审核成功',
          });
        } else {
          results.failCount++;
          results.details.push({
            applicationId: item.applicationId,
            success: false,
            message: '申请不存在',
          });
        }
      } catch (error: any) {
        results.failCount++;
        results.details.push({
          applicationId: item.applicationId,
          success: false,
          message: error.message || '审核失败',
        });
      }
    }

    logger.info(`批量审核违约申请: 成功=${results.successCount}, 失败=${results.failCount}`);
    return results;
  }

  /**
   * 生成客户编码
   */
  private async generateCustomerCode(tx: any): Promise<string> {
    const result = await tx.$queryRaw`
      SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) + 1 as next_num
      FROM customers
      WHERE customer_code LIKE 'CUST%'
    `;
    
    const nextNum = result[0]?.next_num || 1;
    return `CUST${nextNum.toString().padStart(3, '0')}`;
  }
}