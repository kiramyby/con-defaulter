import 'dotenv/config';
import './types/express.d.ts';
import App from './app';
import logger from './config/logger';

// 处理未捕获的异常
process.on('uncaughtException', (error: Error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在优雅关闭服务器...');
  process.exit(0);
});

// 启动应用
const startServer = async () => {
  try {
    const app = new App();
    await app.start();
  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer();