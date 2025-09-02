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
    return res.status(401).json({ error: '需要认证token' });
  }

  try {
    // 验证JWT token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: '无效的token' });
    }

    // 获取用户的username（从数据库users表中）
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('username, role')
      .eq('email', user.email)
      .single();

    if (dbError || !dbUser) {
      console.error('查询用户数据库失败:', dbError);
      return res.status(404).json({ error: '用户不在数据库中或查询失败' });
    }

    // 将用户信息添加到请求对象中
    req.user = {
      id: user.id,
      email: user.email,
      username: dbUser.username,
      role: dbUser.role
    };

    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(500).json({ error: '认证服务错误' });
  }
};

// 角色权限检查中间件
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '需要登录' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

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