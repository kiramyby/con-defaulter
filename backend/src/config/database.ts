import { PrismaClient } from '@prisma/client';
import logger from './logger';

// 创建 Prisma 客户端实例
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// 监听查询日志
prisma.$on('query', (e) => {
  logger.debug('Query: ' + e.query);
  logger.debug('Params: ' + e.params);
  logger.debug('Duration: ' + e.duration + 'ms');
});

// 数据库连接函数
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
    process.exit(1);
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

export { prisma };
export default prisma;