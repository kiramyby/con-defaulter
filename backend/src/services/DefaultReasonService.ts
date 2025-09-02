import { PrismaClient, DefaultReason } from '@prisma/client';
import { 
  DefaultReasonDto, 
  CreateDefaultReasonDto, 
  UpdateDefaultReasonDto,
  PaginatedResponse, 
} from '../types/api';
import logger from '../config/logger';

export class DefaultReasonService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 获取违约原因列表
   */
  async getDefaultReasons(
    page: number = 1,
    size: number = 10,
    enabled?: boolean,
  ): Promise<PaginatedResponse<DefaultReasonDto>> {
    const skip = (page - 1) * size;
    
    const where = enabled !== undefined ? { enabled } : {};

    const [total, reasons] = await Promise.all([
      this.prisma.defaultReason.count({ where }),
      this.prisma.defaultReason.findMany({
        where,
        orderBy: [
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip,
        take: size,
      }),
    ]);

    logger.info(`查询违约原因列表: page=${page}, size=${size}, enabled=${enabled}, total=${total}`);

    return {
      total,
      page,
      size,
      list: reasons.map(this.toDto),
    };
  }

  /**
   * 根据ID获取违约原因
   */
  async getDefaultReasonById(id: number): Promise<DefaultReasonDto | null> {
    const reason = await this.prisma.defaultReason.findUnique({
      where: { id: BigInt(id) },
    });

    if (!reason) {
      return null;
    }

    logger.info(`获取违约原因详情: id=${id}`);
    return this.toDto(reason);
  }

  /**
   * 创建违约原因
   */
  async createDefaultReason(
    data: CreateDefaultReasonDto,
    createdBy: string,
  ): Promise<DefaultReasonDto> {
    const reason = await this.prisma.defaultReason.create({
      data: {
        reason: data.reason,
        detail: data.detail,
        enabled: data.enabled,
        sortOrder: data.sortOrder,
        createdBy,
      },
    });

    logger.info(`创建违约原因: id=${reason.id}, reason=${data.reason}, createdBy=${createdBy}`);
    return this.toDto(reason);
  }

  /**
   * 更新违约原因
   */
  async updateDefaultReason(
    id: number,
    data: UpdateDefaultReasonDto,
    updatedBy: string,
  ): Promise<DefaultReasonDto | null> {
    try {
      const reason = await this.prisma.defaultReason.update({
        where: { id: BigInt(id) },
        data: {
          reason: data.reason,
          detail: data.detail,
          enabled: data.enabled,
          sortOrder: data.sortOrder,
          updatedBy,
        },
      });

      logger.info(`更新违约原因: id=${id}, updatedBy=${updatedBy}`);
      return this.toDto(reason);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // 记录不存在
      }
      throw error;
    }
  }

  /**
   * 删除违约原因
   */
  async deleteDefaultReason(id: number): Promise<boolean> {
    try {
      await this.prisma.defaultReason.delete({
        where: { id: BigInt(id) },
      });

      logger.info(`删除违约原因: id=${id}`);
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false; // 记录不存在
      }
      throw error;
    }
  }

  /**
   * 获取启用的违约原因（用于下拉选择）
   */
  async getEnabledReasons(): Promise<Array<{ id: number; reason: string }>> {
    const reasons = await this.prisma.defaultReason.findMany({
      where: { enabled: true },
      select: { id: true, reason: true },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    return reasons.map(r => ({
      id: Number(r.id),
      reason: r.reason,
    }));
  }

  /**
   * 批量更新违约原因状态
   */
  async batchUpdateStatus(ids: number[], enabled: boolean): Promise<number> {
    const result = await this.prisma.defaultReason.updateMany({
      where: {
        id: { in: ids.map(id => BigInt(id)) },
      },
      data: { enabled },
    });

    logger.info(`批量更新违约原因状态: ids=[${ids.join(',')}], enabled=${enabled}, updated=${result.count}`);
    return result.count;
  }

  /**
   * 转换为DTO
   */
  private toDto(reason: DefaultReason): DefaultReasonDto {
    return {
      id: Number(reason.id),
      reason: reason.reason,
      detail: reason.detail,
      enabled: reason.enabled,
      sortOrder: reason.sortOrder,
      createTime: reason.createTime.toISOString(),
      updateTime: reason.updateTime.toISOString(),
    };
  }
}