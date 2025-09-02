import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

// 创建Supabase客户端实例
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// JWT认证中间件
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      code: 401,
      message: '需要认证token',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 验证JWT token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ 
        code: 403,
        message: '无效的token或token已过期',
        timestamp: new Date().toISOString()
      });
    }

    // 获取用户详细信息（从数据库users表中）
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, username, real_name, role, status, department')
      .eq('email', user.email)
      .eq('status', 'ACTIVE') // 只允许活跃用户
      .single();

    if (dbError || !dbUser) {
      console.error('查询用户数据库失败:', dbError);
      return res.status(404).json({ 
        code: 404,
        message: '用户不存在或已被禁用',
        timestamp: new Date().toISOString()
      });
    }

    // 将完整用户信息添加到请求对象中
    req.user = {
      id: user.id,
      email: user.email,
      dbId: dbUser.id,
      username: dbUser.username,
      realName: dbUser.real_name,
      role: dbUser.role,
      status: dbUser.status,
      department: dbUser.department
    };

    // 记录用户访问日志（异步）
    setImmediate(() => {
      supabaseAdmin.from('operation_logs').insert({
        username: dbUser.username,
        operation_type: 'ACCESS',
        business_type: 'SYSTEM',
        operation_desc: `用户访问API: ${req.method} ${req.path}`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
      }).then().catch(console.error);
    });

    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(500).json({ 
      code: 500,
      message: '认证服务错误',
      timestamp: new Date().toISOString()
    });
  }
};

// 角色权限检查中间件
export const requireRole = (allowedRoles: ('ADMIN' | 'OPERATOR' | 'AUDITOR')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // 记录权限访问失败日志
      setImmediate(() => {
        supabaseAdmin.from('operation_logs').insert({
          username: req.user!.username,
          operation_type: 'ACCESS_DENIED',
          business_type: 'SYSTEM',
          operation_desc: `权限不足: ${req.method} ${req.path}, 需要角色: ${allowedRoles.join('|')}, 当前角色: ${req.user!.role}`,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent'),
        }).then().catch(console.error);
      });

      return res.status(403).json({ 
        code: 403,
        message: '权限不足，无法访问该资源',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// 检查用户是否可以操作特定数据（数据级别权限）
export const requireDataAccess = (checkOwnership = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 401,
        message: '需要登录',
        timestamp: new Date().toISOString()
      });
    }

    // 管理员可以访问所有数据
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // 如果需要检查数据所有权，将检查逻辑传递给控制器
    req.checkDataAccess = {
      username: req.user.username,
      role: req.user.role,
      checkOwnership
    };

    next();
  };
};

// 处理Supabase客户端用户的上下文
export const setSupabaseContext = (supabase: SupabaseClient, user: any) => {
  return supabase.auth.setSession({
    access_token: user.token,
    refresh_token: user.refreshToken
  });
};