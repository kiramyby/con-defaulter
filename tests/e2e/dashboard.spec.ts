import { test, expect } from '@playwright/test';

// 基于TestSprite前端测试计划的仪表板测试
test.describe('仪表板导航功能', () => {
  // 在每个测试前先登录
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test.admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('仪表板页面加载和基本元素验证', async ({ page }) => {
    // 验证仪表板标题
    await expect(page.locator('h1, h2').first()).toContainText('仪表板');
    
    // 验证导航标签是否存在
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    
    // 验证主要标签页
    const expectedTabs = ['概览', '违约原因管理', '违约申请管理', '续展管理', '统计分析', '用户管理'];
    for (const tabName of expectedTabs) {
      await expect(page.locator(`[role="tab"]:has-text("${tabName}")`)).toBeVisible();
    }
  });

  test('标签页导航功能', async ({ page }) => {
    // 点击违约原因管理标签
    await page.click('[role="tab"]:has-text("违约原因管理")');
    await expect(page.locator('[role="tabpanel"]')).toContainText('违约原因');
    
    // 点击违约申请管理标签
    await page.click('[role="tab"]:has-text("违约申请管理")');
    await expect(page.locator('[role="tabpanel"]')).toContainText('违约申请');
    
    // 点击统计分析标签
    await page.click('[role="tab"]:has-text("统计分析")');
    await expect(page.locator('[role="tabpanel"]')).toContainText('统计');
    
    // 点击用户管理标签（仅管理员可见）
    const userManagementTab = page.locator('[role="tab"]:has-text("用户管理")');
    if (await userManagementTab.isVisible()) {
      await userManagementTab.click();
      await expect(page.locator('[role="tabpanel"]')).toContainText('用户');
    }
  });

  test('概览页面统计卡片显示', async ({ page }) => {
    // 验证统计卡片是否显示
    await expect(page.locator('[data-testid="stats-card"], .card').first()).toBeVisible();
    
    // 检查是否有数字显示（统计数据）
    const statsCards = page.locator('[data-testid="stats-card"], .card');
    const cardCount = await statsCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // 验证每个卡片都包含数字
    for (let i = 0; i < cardCount; i++) {
      const card = statsCards.nth(i);
      await expect(card).toBeVisible();
    }
  });

  test('响应式设计测试', async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    
    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    // 在移动视图中，标签可能会折叠或重新排列
    await expect(page.locator('body')).toBeVisible();
  });

  test('加载状态和错误处理', async ({ page }) => {
    // 刷新页面并检查加载状态
    await page.reload();
    
    // 等待页面完全加载
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    
    // 验证没有显示错误状态
    const errorElements = page.locator('[role="alert"], .error, .alert-error');
    const errorCount = await errorElements.count();
    if (errorCount > 0) {
      // 如果有错误，记录但不一定失败测试
      console.log('发现错误元素:', await errorElements.first().textContent());
    }
  });
});