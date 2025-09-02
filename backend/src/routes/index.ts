import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

// Controllers
import { DefaultReasonController } from '../controllers/DefaultReasonController';
import { DefaultApplicationController } from '../controllers/DefaultApplicationController';
import { DefaultCustomerController } from '../controllers/DefaultCustomerController';
import { RenewalController } from '../controllers/RenewalController';

// Services
import { DefaultReasonService } from '../services/DefaultReasonService';
import { DefaultApplicationService } from '../services/DefaultApplicationService';
import { DefaultCustomerService } from '../services/DefaultCustomerService';
import { RenewalService } from '../services/RenewalService';

// Validation
import { 
  validate, 
  validateQuery, 
  defaultReasonValidation, 
  defaultApplicationValidation,
  renewalValidation, 
} from '../utils/validation';

// Middleware
import { authenticateToken, requireRole, requireDataAccess } from '../middleware/auth';

const router = Router();

// 初始化服务和控制器
const initializeRoutes = (prisma: PrismaClient) => {
  // 初始化服务
  const defaultReasonService = new DefaultReasonService(prisma);
  const defaultApplicationService = new DefaultApplicationService(prisma);
  const defaultCustomerService = new DefaultCustomerService(prisma);
  const renewalService = new RenewalService(prisma);

  // 初始化控制器
  const defaultReasonController = new DefaultReasonController(defaultReasonService);
  const defaultApplicationController = new DefaultApplicationController(defaultApplicationService);
  const defaultCustomerController = new DefaultCustomerController(defaultCustomerService);
  const renewalController = new RenewalController(renewalService);

  // 健康检查
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ==================== 违约原因管理路由 ====================
  router.get('/default-reasons', 
    validateQuery(defaultReasonValidation.query),
    defaultReasonController.getReasons,
  );
  
  router.get('/default-reasons/enabled', 
    defaultReasonController.getEnabledReasons,
  );
  
  router.get('/default-reasons/:id', 
    defaultReasonController.getReasonById,
  );
  
  router.post('/default-reasons',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']),
    validate(defaultReasonValidation.create),
    defaultReasonController.createReason,
  );
  
  router.put('/default-reasons/:id',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']),
    validate(defaultReasonValidation.update),
    defaultReasonController.updateReason,
  );
  
  router.delete('/default-reasons/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    defaultReasonController.deleteReason,
  );
  
  router.post('/default-reasons/batch-status',
    authenticateToken,
    requireRole(['ADMIN']),
    defaultReasonController.batchUpdateStatus,
  );

  // ==================== 违约认定申请路由 ====================
  router.post('/default-applications',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']), // 只有管理员和操作员可以提交申请
    validate(defaultApplicationValidation.create),
    defaultApplicationController.createApplication,
  );
  
  router.get('/default-applications',
    authenticateToken,
    requireDataAccess(true), // 需要检查数据访问权限
    validateQuery(defaultApplicationValidation.query),
    defaultApplicationController.getApplications,
  );
  
  router.get('/default-applications/:applicationId',
    authenticateToken,
    requireDataAccess(true), // 需要检查数据访问权限
    defaultApplicationController.getApplicationDetail,
  );
  
  router.post('/default-applications/:applicationId/approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(defaultApplicationValidation.approve),
    defaultApplicationController.approveApplication,
  );
  
  router.post('/default-applications/batch-approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(defaultApplicationValidation.batchApprove),
    defaultApplicationController.batchApprove,
  );

  // ==================== 违约客户查询路由 ====================
  router.get('/default-customers',
    authenticateToken,
    requireDataAccess(false), // 所有角色都可查看，但可能有数据范围限制
    defaultCustomerController.getDefaultCustomers,
  );
  
  router.get('/default-customers/export',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR', 'OPERATOR']), // 所有角色都可导出
    requireDataAccess(false),
    defaultCustomerController.exportDefaultCustomers,
  );
  
  router.get('/default-customers/renewable',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']), // 只有管理员和操作员可以查看可续期客户
    defaultCustomerController.getRenewableCustomers,
  );
  
  router.get('/default-customers/:customerId',
    authenticateToken,
    requireDataAccess(true), // 需要检查是否有权限查看特定客户
    defaultCustomerController.getDefaultCustomerByCustomerId,
  );

  // ==================== 违约重生管理路由 ====================
  router.get('/renewal-reasons',
    renewalController.getRenewalReasons,
  );
  
  router.post('/renewals',
    authenticateToken,
    requireRole(['ADMIN', 'OPERATOR']),
    validate(renewalValidation.create),
    renewalController.createRenewal,
  );
  
  router.get('/renewals',
    authenticateToken,
    renewalController.getRenewals,
  );
  
  router.get('/renewals/:renewalId',
    authenticateToken,
    renewalController.getRenewalDetail,
  );
  
  router.post('/renewals/:renewalId/approve',
    authenticateToken,
    requireRole(['ADMIN', 'AUDITOR']),
    validate(renewalValidation.approve),
    renewalController.approveRenewal,
  );

  // TODO: 文件上传路由
  // router.post('/files/upload', upload.single('file'), fileController.uploadFile);

  // TODO: 统计分析路由
  // router.get('/statistics/by-industry', statisticsController.getIndustryStats);
  // router.get('/statistics/by-region', statisticsController.getRegionStats);
  // router.get('/statistics/trend', statisticsController.getTrendData);

  return router;
};

export { initializeRoutes };
export default router;