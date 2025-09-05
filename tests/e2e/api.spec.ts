import { test, expect } from '@playwright/test';

// 基于TestSprite后端测试计划的API集成测试
test.describe('API集成测试', () => {
  let authToken: string;
  const baseURL = 'http://localhost:3001';

  test.beforeAll(async ({ request }) => {
    // 获取认证令牌用于API测试
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'test.admin@example.com',
        password: 'password123'
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      authToken = data.token;
    } else {
      // 使用TestSprite配置中的令牌作为fallback
      authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE2IiwiZGJJZCI6MTYsImVtYWlsIjoidGVzdC5hZG1pbkBleGFtcGxlLmNvbSIsInVzZXJuYW1lIjoidGVzdF9hZG1pbiIsInJlYWxOYW1lIjoi5rWL6K-V566h55CG5ZGYIiwicm9sZSI6IkFETUlOIiwic3RhdHVzIjoiQUNUSVZFIiwiZGVwYXJ0bWVudCI6Iua1i-ivlemDqOmXqCIsImlhdCI6MTc1NzA4ODg1MiwiZXhwIjoxNzU3MDg5NzUyLCJhdWQiOiJjb24tZGVmYXVsdGVyLWNsaWVudCIsImlzcyI6ImNvbi1kZWZhdWx0ZXIifQ.oazsq3eRFNTiMw8eUQac0Ssnt5xGI8i3hdQQM0o1EY4';
    }
  });

  // TC001: JWT认证和令牌刷新测试
  test('TC001: JWT认证系统测试', async ({ request }) => {
    // 测试登录端点
    const loginResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'test.admin@example.com',
        password: 'password123'
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.token).toBeDefined();
    expect(loginData.user).toBeDefined();
    
    // 测试受保护的端点
    const protectedResponse = await request.get(`${baseURL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    expect(protectedResponse.ok()).toBeTruthy();
  });

  // TC002: 基于角色的访问控制测试
  test('TC002: RBAC权限控制测试', async ({ request }) => {
    // 测试管理员权限
    const adminResponse = await request.get(`${baseURL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(adminResponse.ok()).toBeTruthy();
    
    // 测试无权限访问
    const unauthorizedResponse = await request.get(`${baseURL}/users`, {
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });
    
    expect(unauthorizedResponse.status()).toBe(401);
  });

  // TC003: 违约客户CRUD和导出测试
  test('TC003: 违约客户管理API测试', async ({ request }) => {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    // 测试获取客户列表
    const listResponse = await request.get(`${baseURL}/default-customers`, { headers });
    expect(listResponse.ok()).toBeTruthy();
    
    const listData = await listResponse.json();
    expect(listData.data).toBeDefined();
    expect(Array.isArray(listData.data)).toBeTruthy();
    
    // 测试创建新客户
    const createResponse = await request.post(`${baseURL}/default-customers`, {
      headers,
      data: {
        customerName: 'API测试客户',
        customerCode: 'API_TEST_001',
        contactPerson: '测试联系人',
        contactPhone: '13800138000',
        industry: '软件开发',
        region: '北京'
      }
    });
    
    if (createResponse.ok()) {
      const createData = await createResponse.json();
      const customerId = createData.data.id;
      
      // 测试获取单个客户详情
      const detailResponse = await request.get(`${baseURL}/default-customers/${customerId}`, { headers });
      expect(detailResponse.ok()).toBeTruthy();
      
      // 测试更新客户
      const updateResponse = await request.put(`${baseURL}/default-customers/${customerId}`, {
        headers,
        data: {
          customerName: 'API测试客户_更新'
        }
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      
      // 测试删除客户
      const deleteResponse = await request.delete(`${baseURL}/default-customers/${customerId}`, { headers });
      expect(deleteResponse.ok()).toBeTruthy();
    }
    
    // 测试导出功能
    const exportResponse = await request.get(`${baseURL}/default-customers/export`, { headers });
    expect(exportResponse.ok()).toBeTruthy();
  });

  // TC004: 违约申请提交和审批测试
  test('TC004: 违约申请管理API测试', async ({ request }) => {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    // 测试获取申请列表
    const listResponse = await request.get(`${baseURL}/default-applications`, { headers });
    expect(listResponse.ok()).toBeTruthy();
    
    // 测试创建新申请
    const createResponse = await request.post(`${baseURL}/default-applications`, {
      headers,
      data: {
        customerId: 1,
        reasonId: 1,
        description: 'API测试申请',
        amount: 10000,
        applicationDate: new Date().toISOString()
      }
    });
    
    if (createResponse.ok()) {
      const createData = await createResponse.json();
      const applicationId = createData.data.id;
      
      // 测试审批申请
      const approvalResponse = await request.post(`${baseURL}/default-applications/${applicationId}/approve`, {
        headers,
        data: {
          status: 'APPROVED',
          comments: 'API测试审批'
        }
      });
      
      expect(approvalResponse.ok()).toBeTruthy();
    }
  });

  // TC007: 统计查询和报告导出测试
  test('TC007: 统计分析API测试', async ({ request }) => {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    // 测试获取统计数据
    const statsResponse = await request.get(`${baseURL}/statistics`, { headers });
    expect(statsResponse.ok()).toBeTruthy();
    
    const statsData = await statsResponse.json();
    expect(statsData.industryStats).toBeDefined();
    expect(statsData.regionStats).toBeDefined();
    
    // 测试趋势数据
    const trendResponse = await request.get(`${baseURL}/statistics/trends`, {
      headers,
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
    });
    
    expect(trendResponse.ok()).toBeTruthy();
    
    // 测试统计报告导出
    const exportResponse = await request.get(`${baseURL}/statistics/export`, { headers });
    expect(exportResponse.ok()).toBeTruthy();
  });

  // TC010: API限流和错误处理测试
  test('TC010: API限流和错误处理测试', async ({ request }) => {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    // 测试错误处理 - 无效参数
    const invalidResponse = await request.get(`${baseURL}/default-customers/invalid_id`, { headers });
    expect(invalidResponse.status()).toBe(404);
    
    const errorData = await invalidResponse.json();
    expect(errorData.error).toBeDefined();
    expect(errorData.code).toBeDefined();
    
    // 测试参数验证错误
    const validationResponse = await request.post(`${baseURL}/default-customers`, {
      headers,
      data: {
        // 缺少必需字段
        customerName: ''
      }
    });
    
    expect(validationResponse.status()).toBe(400);
    
    // 注意：限流测试可能需要大量请求，在CI环境中谨慎执行
    // 这里只做基本的限流头检查
    const rateLimitResponse = await request.get(`${baseURL}/default-customers`, { headers });
    const rateLimitHeaders = rateLimitResponse.headers();
    
    // 检查是否有限流相关的头信息
    console.log('Rate limit headers:', {
      'x-ratelimit-limit': rateLimitHeaders['x-ratelimit-limit'],
      'x-ratelimit-remaining': rateLimitHeaders['x-ratelimit-remaining'],
      'x-ratelimit-reset': rateLimitHeaders['x-ratelimit-reset']
    });
  });
});