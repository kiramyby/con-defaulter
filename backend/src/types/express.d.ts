// Express 扩展类型定义

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;              // Supabase auth ID
        email?: string;          // 用户邮箱
        dbId: number;           // 数据库中的用户ID
        username: string;       // 用户名
        realName: string;       // 真实姓名
        role: 'ADMIN' | 'AUDITOR' | 'OPERATOR' | 'USER';  // 用户角色
        status: 'ACTIVE' | 'INACTIVE';           // 用户状态
        department?: string;    // 部门
      };
      checkDataAccess?: {
        username: string;
        role: 'ADMIN' | 'AUDITOR' | 'OPERATOR' | 'USER';
        checkOwnership: boolean;
      };
    }
  }
}

export {};