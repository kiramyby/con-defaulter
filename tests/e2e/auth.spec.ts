import { test, expect } from '@playwright/test';

// 基于TestSprite前端测试计划的认证测试
test.describe('用户认证功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('用户登录 - 有效凭据', async ({ page }) => {
    // 导航到登录页面
    await page.goto('/login');
    
    // 验证登录页面元素
    await expect(page.locator('h1')).toContainText('登录');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 输入有效凭据
    await page.fill('input[type="email"]', 'test.admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 验证成功登录并重定向到仪表板
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('仪表板');
  });

  test('用户登录 - 无效凭据', async ({ page }) => {
    await page.goto('/login');
    
    // 输入无效凭据
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 验证错误消息
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText('登录失败');
    
    // 确保仍在登录页面
    await expect(page).toHaveURL('/login');
  });

  test('用户注册功能', async ({ page }) => {
    await page.goto('/register');
    
    // 验证注册表单元素
    await expect(page.locator('h1')).toContainText('注册');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('select[name="role"]')).toBeVisible();
    
    // 填写注册表单
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="realName"]', '测试用户');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="phone"]', '13800138000');
    await page.fill('input[name="department"]', '测试部门');
    await page.selectOption('select[name="role"]', 'USER');
    await page.fill('input[name="password"]', 'password123');
    
    // 提交注册表单
    await page.click('button[type="submit"]');
    
    // 验证注册成功（可能显示成功消息或重定向）
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('登出功能', async ({ page }) => {
    // 首先登录
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test.admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 等待重定向到仪表板
    await expect(page).toHaveURL('/dashboard');
    
    // 点击登出按钮
    await page.click('button[aria-label="登出"], button:has-text("登出")');
    
    // 验证重定向到登录页面
    await expect(page).toHaveURL('/login');
  });
});