/**
 * 统一异步错误处理中间件
 * 避免在每个路由文件中重复定义 asyncHandler
 * 
 * 用法:
 *   import { asyncHandler } from '../middleware/asyncHandler';
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */

import { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 兼容旧版签名（部分路由使用 any 类型）
export function asyncHandlerAny(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
