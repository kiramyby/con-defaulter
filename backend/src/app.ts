import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';

import { config } from './config/env';
import { connectDatabase } from './config/database';
import { initializeRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { specs } from './config/swagger';
import logger from './config/logger';

class App {
  public app: Application;
  private prisma: PrismaClient;

  constructor() {
    this.app = express();
    this.prisma = new PrismaClient();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:', 'https:'],
        },
      },
    }));

    // CORS配置
    this.app.use(cors({
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // 压缩响应
    this.app.use(compression());

    // 解析JSON和URL编码数据
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志中间件
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
      });
      
      next();
    });

    // 静态文件服务（用于上传的文件）
    this.app.use('/uploads', express.static(config.UPLOAD_PATH));
  }

  private initializeRoutes(): void {
    // 初始化API路由
    const apiRoutes = initializeRoutes(this.prisma);
    this.app.use('/api/v1', apiRoutes);

    // 根路径健康检查
    this.app.get('/', (req, res) => {
      res.json({
        name: '违约客户管理系统',
        version: '1.0.0',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
        status: 'running',
      });
    });

    // Service Worker 处理 - 避免404错误
    this.app.get('/sw.js', (req, res) => {
      res.status(204).end(); // 返回204 No Content，避免404错误
    });

    // API文档路由
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "违约客户管理系统 API文档"
    }));
  }

  private initializeErrorHandling(): void {
    // 404处理
    this.app.use(notFoundHandler);
    
    // 全局错误处理
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // 连接数据库
      await connectDatabase();
      
      // 启动服务器
      this.app.listen(config.PORT, () => {
        logger.info('🚀 服务器启动成功！');
        logger.info(`📦 环境: ${config.NODE_ENV}`);
        logger.info(`🌐 端口: ${config.PORT}`);
        logger.info(`🔗 URL: http://localhost:${config.PORT}`);
        logger.info(`📚 API文档: http://localhost:${config.PORT}/api-docs`);
      });

    } catch (error) {
      logger.error('服务器启动失败:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }
}

export default App;