// 权限配置文件 - 与前端保持一致
export type UserRole = 'ADMIN' | 'AUDITOR' | 'OPERATOR' | 'USER';
export type Permission = keyof typeof PERMISSIONS;

// 权限定义 - 与前端权限系统保持完全一致
export const PERMISSIONS = {
  // 基础权限
  VIEW_OVERVIEW: ['ADMIN', 'AUDITOR', 'OPERATOR', 'USER'],
  
  // 用户管理 - 仅管理员
  CREATE_USER: ['ADMIN'],
  MANAGE_USERS: ['ADMIN'],
  VIEW_USERS: ['ADMIN'],
  UPDATE_USER: ['ADMIN'],
  DELETE_USER: ['ADMIN'],
  
  // 违约原因管理 - 管理员可以CRUD，操作员只能查看
  CREATE_DEFAULT_REASON: ['ADMIN'],
  UPDATE_DEFAULT_REASON: ['ADMIN'],
  DELETE_DEFAULT_REASON: ['ADMIN'],
  VIEW_DEFAULT_REASONS: ['ADMIN', 'OPERATOR'],
  
  // 违约申请管理 - 操作员创建，审核员审核，管理员全权限
  CREATE_DEFAULT_APPLICATION: ['ADMIN', 'OPERATOR'],
  VIEW_ALL_APPLICATIONS: ['ADMIN', 'AUDITOR'],
  VIEW_OWN_APPLICATIONS: ['OPERATOR'],
  APPROVE_APPLICATIONS: ['ADMIN', 'AUDITOR'],
  
  // 违约客户查询 - 分层查看权限
  VIEW_ALL_CUSTOMERS: ['ADMIN', 'AUDITOR'],
  VIEW_OWN_CUSTOMERS: ['OPERATOR'],
  
  // 违约重生管理 - 类似申请管理
  CREATE_RENEWAL_APPLICATION: ['ADMIN', 'OPERATOR'],
  VIEW_RENEWABLE_CUSTOMERS: ['ADMIN', 'OPERATOR'],
  VIEW_ALL_RENEWALS: ['ADMIN', 'AUDITOR'],
  VIEW_OWN_RENEWALS: ['OPERATOR'],
  APPROVE_RENEWALS: ['ADMIN', 'AUDITOR'],
  
  // 统计分析 - 分层权限
  VIEW_BASIC_STATISTICS: ['ADMIN', 'AUDITOR', 'OPERATOR', 'USER'],
  VIEW_STATISTICS: ['ADMIN', 'AUDITOR', 'OPERATOR'],
  ADVANCED_ANALYTICS: ['ADMIN', 'AUDITOR'],
  
  // 数据导出 - 分层权限
  EXPORT_OWN_DATA: ['ADMIN', 'OPERATOR'],
  EXPORT_ALL_DATA: ['ADMIN', 'AUDITOR'],
  
  // 系统管理 - 仅管理员
  SYSTEM_CONFIG: ['ADMIN'],
  VIEW_SYSTEM_LOGS: ['ADMIN'],
} as const;

// 权限检查工具类
export class PermissionChecker {
  constructor(private userRole: UserRole) {}

  hasPermission(permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    return allowedRoles.includes(this.userRole);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // 检查数据访问权限
  canViewAllData(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'AUDITOR';
  }

  canViewOwnData(): boolean {
    return this.userRole === 'OPERATOR';
  }

  // 检查审核权限
  canApprove(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'AUDITOR';
  }

  // 检查创建权限
  canCreate(): boolean {
    return this.userRole === 'ADMIN' || this.userRole === 'OPERATOR';
  }

  // 检查管理权限
  canManage(): boolean {
    return this.userRole === 'ADMIN';
  }
}

// 权限中间件工厂函数
export const requirePermission = (permission: Permission) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    const checker = new PermissionChecker(req.user.role);
    if (!checker.hasPermission(permission)) {
      return res.status(403).json({ 
        code: 403,
        message: `权限不足，需要${permission}权限`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// 权限中间件工厂函数 - 多个权限任一即可
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    const checker = new PermissionChecker(req.user.role);
    if (!checker.hasAnyPermission(permissions)) {
      return res.status(403).json({ 
        code: 403,
        message: `权限不足，需要以下权限之一：${permissions.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// 权限中间件工厂函数 - 多个权限全部需要
export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    const checker = new PermissionChecker(req.user.role);
    if (!checker.hasAllPermissions(permissions)) {
      return res.status(403).json({ 
        code: 403,
        message: `权限不足，需要以下所有权限：${permissions.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// 数据级权限检查中间件
export const requireDataAccess = (checkOwnership = true) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    const checker = new PermissionChecker(req.user.role);
    
    // 如果可以查看所有数据，直接通过
    if (checker.canViewAllData()) {
      req.dataAccess = { level: 'all' };
      return next();
    }
    
    // 如果可以查看自己的数据
    if (checker.canViewOwnData()) {
      req.dataAccess = { 
        level: 'own', 
        username: req.user.username,
        checkOwnership 
      };
      return next();
    }
    
    // 其他角色只能查看基础信息
    req.dataAccess = { level: 'basic' };
    next();
  };
};