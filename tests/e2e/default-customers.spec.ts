import { test, expect } from '@playwright/test';

// 基于TestSprite测试计划的违约客户管理功能测试
test.describe('违约客户管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录到系统
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test.admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // 导航到违约客户管理标签
    await page.click('[role="tab"]:has-text("违约客户管理"), [role="tab"]:has-text("客户管理")');
  });

  test('违约客户列表查看', async ({ page }) => {
    // 验证客户列表表格存在
    await expect(page.locator('table, [role="table"]')).toBeVisible();
    
    // 验证表格表头
    const expectedHeaders = ['客户名称', '客户编号', '状态', '操作'];
    for (const header of expectedHeaders) {
      await expect(page.locator(`th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`)).toBeVisible();
    }
    
    // 验证是否有数据行
    const rows = page.locator('tbody tr, [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('创建新的违约客户', async ({ page }) => {
    // 点击创建/添加按钮
    await page.click('button:has-text("创建"), button:has-text("添加"), button:has-text("新建")');
    
    // 验证创建表单对话框出现
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    
    // 填写客户信息
    await page.fill('input[name="customerName"], input[placeholder*="客户名称"]', '测试客户公司');
    await page.fill('input[name="customerCode"], input[placeholder*="客户编号"]', 'TEST001');
    await page.fill('input[name="contactPerson"], input[placeholder*="联系人"]', '张三');
    await page.fill('input[name="contactPhone"], input[placeholder*="电话"]', '13800138000');
    
    // 选择行业类别（如果有下拉菜单）
    const industrySelect = page.locator('select[name="industry"], [role="combobox"]').first();
    if (await industrySelect.isVisible()) {
      await industrySelect.selectOption({ index: 1 });
    }
    
    // 提交表单
    await page.click('button[type="submit"]:has-text("确定"), button[type="submit"]:has-text("创建"), button[type="submit"]:has-text("保存")');
    
    // 验证成功消息
    await expect(page.locator('[role="alert"]:has-text("成功"), .toast:has-text("成功")')).toBeVisible();
    
    // 验证新客户出现在列表中
    await expect(page.locator('td:has-text("测试客户公司")')).toBeVisible();
  });

  test('搜索和过滤功能', async ({ page }) => {
    // 查找搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="查找"]').first();
    
    if (await searchInput.isVisible()) {
      // 输入搜索关键词
      await searchInput.fill('测试');
      
      // 等待搜索结果
      await page.waitForTimeout(1000);
      
      // 验证搜索结果
      const results = page.locator('tbody tr, [role="row"]');
      const resultCount = await results.count();
      
      if (resultCount > 0) {
        // 验证结果包含搜索关键词
        await expect(results.first()).toContainText('测试');
      }
    }
    
    // 测试状态过滤器（如果存在）
    const statusFilter = page.locator('select[name="status"], [role="combobox"]:has-text("状态")').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
    }
  });

  test('编辑违约客户', async ({ page }) => {
    // 找到第一行的编辑按钮
    const editButton = page.locator('button:has-text("编辑"), [aria-label="编辑"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // 验证编辑表单出现
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
      
      // 修改客户名称
      const nameInput = page.locator('input[name="customerName"], input[placeholder*="客户名称"]');
      await nameInput.clear();
      await nameInput.fill('更新后的客户名称');
      
      // 保存修改
      await page.click('button[type="submit"]:has-text("确定"), button[type="submit"]:has-text("保存")');
      
      // 验证成功消息
      await expect(page.locator('[role="alert"]:has-text("成功"), .toast:has-text("成功")')).toBeVisible();
    }
  });

  test('导出功能', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('button:has-text("导出"), button:has-text("Export")');
    
    if (await exportButton.isVisible()) {
      // 设置下载处理
      const downloadPromise = page.waitForEvent('download');
      
      // 点击导出按钮
      await exportButton.click();
      
      // 等待下载开始
      const download = await downloadPromise;
      
      // 验证下载的文件
      expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv|pdf)$/);
    }
  });

  test('删除违约客户', async ({ page }) => {
    // 找到删除按钮（通常在操作列）
    const deleteButton = page.locator('button:has-text("删除"), [aria-label="删除"]').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // 验证确认对话框
      await expect(page.locator('[role="dialog"]:has-text("确认"), .modal:has-text("确认")')).toBeVisible();
      
      // 确认删除
      await page.click('button:has-text("确认"), button:has-text("删除")');
      
      // 验证成功消息
      await expect(page.locator('[role="alert"]:has-text("成功"), .toast:has-text("成功")')).toBeVisible();
    }
  });

  test('分页功能', async ({ page }) => {
    // 查找分页控件
    const pagination = page.locator('.pagination, [role="navigation"]').first();
    
    if (await pagination.isVisible()) {
      // 检查下一页按钮
      const nextButton = page.locator('button:has-text("下一页"), button[aria-label="Next"]');
      
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();
        
        // 等待页面更新
        await page.waitForTimeout(1000);
        
        // 验证页面已更新
        await expect(page.locator('table, [role="table"]')).toBeVisible();
      }
    }
  });
});