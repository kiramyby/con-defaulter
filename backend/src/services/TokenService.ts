import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import logger from '../config/logger';
import securityNotificationService from './SecurityNotificationService';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenRecord {
  id: string;
  userId: bigint;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  isRevoked: boolean;
}

class TokenService {
  private prisma: PrismaClient;
  
  // Token 配置
  private readonly ACCESS_TOKEN_EXPIRES = '15m';  // 15分钟（提升安全性）
  private readonly REFRESH_TOKEN_EXPIRES = 30 * 24 * 60 * 60 * 1000; // 30天毫秒
  private readonly GRACE_PERIOD = 5 * 60 * 1000; // 5分钟宽限期

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 生成 Token 对（登录时使用）
   */
  async generateTokenPair(
    userId: bigint,
    userInfo: any,
    deviceInfo?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<TokenPair> {
    // 生成 Access Token (JWT)
    const accessTokenPayload = {
      id: userInfo.id, // 保持为字符串格式的数据库ID（兼容原有API）
      dbId: Number(userId), // 转换为数字格式（兼容express.d.ts类型定义）
      email: userInfo.email,
      username: userInfo.username,
      realName: userInfo.realName,
      role: userInfo.role,
      status: userInfo.status,
      department: userInfo.department,
    };

    const accessToken = jwt.sign(accessTokenPayload, config.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
      issuer: 'con-defaulter',
      audience: 'con-defaulter-client',
    });

    // 生成 Refresh Token
    const refreshToken = this.generateSecureToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    // 存储 Refresh Token 记录
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES);
    
    await this.prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        tokenHash: refreshTokenHash,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        expiresAt,
        lastUsedAt: new Date(),
        isRevoked: false,
      },
    });

    // 清理该用户的过期 refresh token
    await this.cleanupExpiredTokens(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 150 * 60, // 150分钟（秒）
      tokenType: 'Bearer',
    };
  }

  /**
   * 刷新 Token（轮转机制）
   */
  async refreshTokenPair(
    refreshToken: string,
    deviceInfo?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    // 查找 refresh token 记录
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            role: true,
            status: true,
            department: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      // 检查是否是已被轮转的 token（在宽限期内）
      await this.handleSuspiciousTokenUsage(tokenHash, deviceInfo);
      throw new Error('Invalid or expired refresh token');
    }

    // 检查用户状态
    if (tokenRecord.user.status !== 'ACTIVE') {
      await this.revokeAllUserTokens(tokenRecord.userId, 'user_inactive');
      throw new Error('User account is inactive');
    }

    // 立即撤销当前 refresh token（防止重复使用）
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { 
        isRevoked: true,
        lastUsedAt: new Date(),
      },
    });

    // 生成新的 token 对
    const newTokenPair = await this.generateTokenPair(
      tokenRecord.userId,
      {
        ...tokenRecord.user,
        id: tokenRecord.user.id.toString(), // 将BigInt转换为字符串
      },
      {
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
      }
    );

    logger.info(`Token rotated for user: ${tokenRecord.user.username}`);
    
    return newTokenPair;
  }

  /**
   * 撤销 Refresh Token（登出时使用）
   */
  async revokeRefreshToken(refreshToken: string, reason = 'logout'): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    const result = await this.prisma.refreshToken.updateMany({
      where: { 
        tokenHash,
        isRevoked: false,
      },
      data: { 
        isRevoked: true,
        lastUsedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.info(`Refresh token revoked: ${reason}`);
    }
  }

  /**
   * 撤销用户的所有 Refresh Token
   */
  async revokeAllUserTokens(userId: bigint, reason = 'security'): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { 
        userId,
        isRevoked: false,
      },
      data: { 
        isRevoked: true,
        lastUsedAt: new Date(),
      },
    });

    logger.warn(`Revoked ${result.count} tokens for user ${userId}: ${reason}`);
    return result.count;
  }

  /**
   * 处理可疑 Token 使用（可能的攻击）
   */
  private async handleSuspiciousTokenUsage(
    tokenHash: string, 
    deviceInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<void> {
    // 查找已被撤销但在宽限期内的 token
    const suspiciousToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        isRevoked: true,
        lastUsedAt: { gt: new Date(Date.now() - this.GRACE_PERIOD) },
      },
      include: {
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    if (suspiciousToken) {
      await this.revokeAllUserTokens(suspiciousToken.userId, 'suspicious_activity');
      
      // 记录安全事件
      await securityNotificationService.recordSecurityEvent({
        userId: suspiciousToken.userId,
        username: suspiciousToken.user.username,
        email: suspiciousToken.user.email,
        eventType: 'TOKEN_REUSE_ATTACK',
        severity: 'CRITICAL',
        description: '检测到已撤销的refresh token被重复使用，可能存在token盗用攻击',
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
        metadata: {
          tokenId: suspiciousToken.id,
          lastUsedAt: suspiciousToken.lastUsedAt.toISOString(),
          gracePeriod: this.GRACE_PERIOD,
        },
      });
      
      logger.error(`Suspicious token reuse detected for user ${suspiciousToken.userId}`, {
        tokenId: suspiciousToken.id,
        username: suspiciousToken.user.username,
        deviceInfo,
        lastUsedAt: suspiciousToken.lastUsedAt,
      });
    }
  }

  /**
   * 获取用户的活跃会话列表
   */
  async getUserActiveSessions(userId: bigint): Promise<Array<{
    id: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
    lastUsedAt: Date;
    isCurrent?: boolean;
  }>> {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((session: any) => ({
      ...session,
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
    }));
  }

  /**
   * 撤销特定会话
   */
  async revokeSession(userId: bigint, sessionId: string): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        lastUsedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  /**
   * 清理过期的 Refresh Token
   */
  async cleanupExpiredTokens(userId?: bigint): Promise<number> {
    const where = {
      OR: [
        { expiresAt: { lte: new Date() } },
        { isRevoked: true, lastUsedAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 撤销超过7天的
      ],
      ...(userId && { userId }),
    };

    const result = await this.prisma.refreshToken.deleteMany({ where });
    
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired/revoked tokens`);
    }
    
    return result.count;
  }

  /**
   * 生成安全的随机 token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * 对 token 进行哈希（用于数据库存储）
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 验证 Access Token（可选，通常在 JWT 中间件中处理）
   */
  verifyAccessToken(accessToken: string): jwt.JwtPayload | string {
    try {
      return jwt.verify(accessToken, config.JWT_SECRET, {
        issuer: 'con-defaulter',
        audience: 'con-defaulter-client',
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * 关闭服务
   */
  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// 单例模式
const tokenService = new TokenService();

export default tokenService;