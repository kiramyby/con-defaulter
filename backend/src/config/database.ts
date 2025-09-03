import { PrismaClient } from '@prisma/client';
import logger from './logger';

// 创建 Prisma 客户端实例
const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});


// 数据库连接函数（带重试机制）
export const connectDatabase = async (retries = 3): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      // 测试连接
      await prisma.$queryRaw`SELECT 1`;
      logger.info('数据库连接成功');
      return;
    } catch (error) {
      logger.warn(`数据库连接尝试 ${i + 1}/${retries} 失败:`, error);
      
      if (i === retries - 1) {
        logger.error('所有数据库连接尝试都失败了');
        process.exit(1);
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};

// 数据库断开连接函数
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('数据库连接已断开');
  } catch (error) {
    logger.error('数据库断开连接失败:', error);
  }
};

// 优雅关闭处理
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，正在关闭数据库连接...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，正在关闭数据库连接...');
  await disconnectDatabase();
  process.exit(0);
});

// 连接健康检查
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return false;
  }
};

// 定期健康检查（每5分钟）
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      logger.warn('数据库连接不健康，尝试重新连接...');
      try {
        await prisma.$disconnect();
        await connectDatabase();
      } catch (error) {
        logger.error('重新连接失败:', error);
      }
    }
  }, 5 * 60 * 1000); // 5分钟检查一次
}

export { prisma };
export default prisma;