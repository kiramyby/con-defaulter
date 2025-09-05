import logger from '../config/logger';

export interface SecurityEvent {
  userId?: bigint;
  username?: string;
  email?: string;
  eventType: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export type SecurityEventType = 
  | 'SUSPICIOUS_LOGIN'
  | 'TOKEN_REUSE_ATTACK'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'ABNORMAL_LOCATION'
  | 'SESSION_HIJACKING'
  | 'ACCOUNT_LOCKOUT'
  | 'PASSWORD_BREACH'
  | 'UNUSUAL_ACTIVITY';

class SecurityNotificationService {
  /**
   * 记录和处理安全事件
   */
  async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // 根据严重程度决定处理策略
      switch (event.severity) {
      case 'CRITICAL':
        await this.handleCriticalEvent(event);
        break;
      case 'HIGH':
        await this.handleHighSeverityEvent(event);
        break;
      case 'MEDIUM':
        await this.handleMediumSeverityEvent(event);
        break;
      case 'LOW':
        await this.handleLowSeverityEvent(event);
        break;
      }

      logger.info(`安全事件记录: ${event.eventType} - ${event.severity} - ${event.username || 'unknown'}`);
    } catch (error) {
      logger.error('记录安全事件失败:', error);
    }
  }

  /**
   * 处理严重安全事件
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    try {
      // 记录到安全日志
      await this.logToSecuritySystem(event);

      logger.warn(`严重安全事件: ${event.eventType} - ${event.username} - ${event.description}`);
    } catch (error) {
      logger.error('处理严重安全事件失败:', error);
    }
  }

  /**
   * 处理高级别安全事件
   */
  private async handleHighSeverityEvent(event: SecurityEvent): Promise<void> {
    try {
      // 记录详细日志
      await this.logToSecuritySystem(event);
      
      logger.warn(`高级别安全事件: ${event.eventType} - ${event.username} - ${event.description}`);
    } catch (error) {
      logger.error('处理高级别安全事件失败:', error);
    }
  }

  /**
   * 处理中等级别安全事件
   */
  private async handleMediumSeverityEvent(event: SecurityEvent): Promise<void> {
    try {
      // 记录警告日志
      logger.warn(`中等安全事件: ${event.eventType} - ${event.username} - ${event.description}`);
    } catch (error) {
      logger.error('处理中等级别安全事件失败:', error);
    }
  }

  /**
   * 处理低级别安全事件
   */
  private async handleLowSeverityEvent(event: SecurityEvent): Promise<void> {
    try {
      // 仅记录信息日志
      logger.info(`低级别安全事件: ${event.eventType} - ${event.username} - ${event.description}`);
    } catch (error) {
      logger.error('处理低级别安全事件失败:', error);
    }
  }

  /**
   * 记录到安全日志系统
   */
  private async logToSecuritySystem(event: SecurityEvent): Promise<void> {
    try {
      // 记录安全警报到日志系统
      logger.warn('SECURITY ALERT', {
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId?.toString(),
        username: event.username,
        description: event.description,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        metadata: event.metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('记录到安全系统失败:', error);
    }
  }

}

// 单例模式
const securityNotificationService = new SecurityNotificationService();

export default securityNotificationService;