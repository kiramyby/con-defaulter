// Express 扩展类型定义

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        username: string;
        role: string;
      };
    }
  }
}