#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class IntegratedTestRunner {
  constructor() {
    this.resultsDir = './test-results';
  }

  async ensureDirectories() {
    await fs.mkdir(this.resultsDir, { recursive: true });
    await fs.mkdir('./playwright-report', { recursive: true });
  }

  async runCommand(command, description) {
    console.log(`\n🚀 ${description}...`);
    
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️  ${description} 完成，但有警告:`);
          console.log(stderr);
          resolve({ success: false, stdout, stderr });
        } else {
          console.log(`✅ ${description} 成功完成`);
          if (stdout) console.log(stdout);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  async checkServices() {
    console.log('\n🔍 检查服务状态...');
    
    try {
      // 检查前端服务
      const frontendCheck = await this.runCommand(
        'curl -s -f http://localhost:3000 || echo "Frontend service not running"',
        '检查前端服务 (localhost:3000)'
      );
      
      // 检查后端服务  
      const backendCheck = await this.runCommand(
        'curl -s -f http://localhost:3001/health || echo "Backend service not running"',
        '检查后端服务 (localhost:3001)'
      );
      
      return {
        frontend: frontendCheck.success,
        backend: backendCheck.success
      };
    } catch (error) {
      console.warn('服务检查失败，将继续测试执行');
      return { frontend: false, backend: false };
    }
  }

  async runPlaywrightTests() {
    console.log('\n🎭 执行Playwright测试...');
    
    // 运行不同类型的测试
    const testResults = [];
    
    // 认证测试
    const authResult = await this.runCommand(
      'npx playwright test tests/e2e/auth.spec.ts --reporter=line',
      '认证功能测试'
    );
    testResults.push({ name: 'auth', ...authResult });
    
    // 仪表板测试  
    const dashboardResult = await this.runCommand(
      'npx playwright test tests/e2e/dashboard.spec.ts --reporter=line',
      '仪表板功能测试'
    );
    testResults.push({ name: 'dashboard', ...dashboardResult });
    
    // API测试
    const apiResult = await this.runCommand(
      'npx playwright test tests/e2e/api.spec.ts --reporter=line',
      'API集成测试'
    );
    testResults.push({ name: 'api', ...apiResult });
    
    return testResults;
  }

  async analyzeTestSpriteResults() {
    console.log('\n📊 分析TestSprite测试计划...');
    
    const analysis = {
      frontend: null,
      backend: null,
      summary: {
        totalTests: 0,
        frontendTests: 0,
        backendTests: 0
      }
    };
    
    try {
      // 读取前端测试计划
      const frontendPlanPath = './testsprite_tests/testsprite_frontend_test_plan.json';
      const frontendContent = await fs.readFile(frontendPlanPath, 'utf-8');
      analysis.frontend = JSON.parse(frontendContent);
      
      if (analysis.frontend.test_plan) {
        analysis.summary.frontendTests = analysis.frontend.test_plan.length;
      }
    } catch (error) {
      console.warn('前端测试计划读取失败');
    }
    
    try {
      // 读取后端测试计划
      const backendPlanPath = './testsprite_tests/testsprite_backend_test_plan.json';
      const backendContent = await fs.readFile(backendPlanPath, 'utf-8');
      analysis.backend = JSON.parse(backendContent);
      
      if (Array.isArray(analysis.backend)) {
        analysis.summary.backendTests = analysis.backend.length;
      }
    } catch (error) {
      console.warn('后端测试计划读取失败');
    }
    
    analysis.summary.totalTests = analysis.summary.frontendTests + analysis.summary.backendTests;
    
    console.log(`📈 TestSprite分析结果:`);
    console.log(`   - 前端测试用例: ${analysis.summary.frontendTests}`);
    console.log(`   - 后端测试用例: ${analysis.summary.backendTests}`);
    console.log(`   - 总计: ${analysis.summary.totalTests}`);
    
    return analysis;
  }

  async generateReport(serviceStatus, testSpriteAnalysis, playwrightResults) {
    const timestamp = new Date().toISOString();
    
    const report = {
      timestamp,
      serviceStatus,
      testSprite: testSpriteAnalysis,
      playwright: {
        results: playwrightResults,
        summary: {
          total: playwrightResults.length,
          passed: playwrightResults.filter(r => r.success).length,
          failed: playwrightResults.filter(r => !r.success).length
        }
      }
    };
    
    // 保存JSON报告
    await fs.writeFile(
      path.join(this.resultsDir, 'integrated-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // 生成Markdown报告
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(
      path.join(this.resultsDir, 'integrated-test-report.md'),
      markdown
    );
    
    return report;
  }

  generateMarkdownReport(report) {
    return `# TestSprite + Playwright 集成测试报告

## 执行概览

**时间:** ${new Date(report.timestamp).toLocaleString('zh-CN')}  
**项目:** con-defaulter  

## 服务状态检查

- **前端服务 (localhost:3000):** ${report.serviceStatus.frontend ? '✅ 运行中' : '❌ 未运行'}
- **后端服务 (localhost:3001):** ${report.serviceStatus.backend ? '✅ 运行中' : '❌ 未运行'}

## TestSprite 测试计划分析

### 测试用例统计
- **前端测试用例:** ${report.testSprite.summary.frontendTests}
- **后端测试用例:** ${report.testSprite.summary.backendTests}  
- **总计:** ${report.testSprite.summary.totalTests}

### 前端测试计划覆盖
${report.testSprite.frontend && report.testSprite.frontend.test_plan 
  ? report.testSprite.frontend.test_plan.map(test => 
      `- **${test.name}** (${test.category}): ${test.description}`
    ).join('\n')
  : '- 暂无前端测试计划'
}

### 后端API测试计划覆盖  
${report.testSprite.backend && Array.isArray(report.testSprite.backend)
  ? report.testSprite.backend.map(test => 
      `- **${test.id}** - ${test.title}: ${test.description}`
    ).join('\n')
  : '- 暂无后端测试计划'
}

## Playwright E2E 测试执行结果

### 测试摘要
- **总计:** ${report.playwright.summary.total}
- **通过:** ${report.playwright.summary.passed}
- **失败:** ${report.playwright.summary.failed}
- **成功率:** ${report.playwright.summary.total > 0 ? ((report.playwright.summary.passed / report.playwright.summary.total) * 100).toFixed(1) : 0}%

### 详细结果
${report.playwright.results.map(result => 
  `#### ${result.name.toUpperCase()} 测试
- **状态:** ${result.success ? '✅ 通过' : '❌ 失败'}
${result.stderr ? `- **错误信息:** \`${result.stderr.substring(0, 200)}...\`` : ''}
`).join('\n')}

## 集成测试优势

### 🔍 TestSprite 优势
1. **智能测试设计:** AI分析代码结构自动生成测试计划
2. **全面覆盖:** 同时覆盖前端UI和后端API测试场景
3. **业务逻辑导向:** 基于实际业务功能设计测试用例

### 🎭 Playwright 优势  
1. **真实环境测试:** 在真实浏览器环境中执行测试
2. **跨平台兼容:** 支持多种浏览器和设备
3. **可靠执行:** 提供稳定的自动化测试执行

### 🚀 集成效果
1. **设计与执行分离:** TestSprite负责测试设计，Playwright负责执行
2. **互补验证:** 理论分析与实际执行相结合
3. **全面质量保证:** 从计划到执行的完整测试覆盖

## 建议和后续行动

### 立即行动
1. ${!report.serviceStatus.frontend ? '启动前端开发服务器 (pnpm dev)' : '前端服务正常运行'}
2. ${!report.serviceStatus.backend ? '启动后端API服务器' : '后端服务正常运行'}
3. 修复失败的测试用例

### 持续改进
1. **扩展测试覆盖:** 基于TestSprite计划补充更多Playwright测试
2. **CI/CD集成:** 将集成测试纳入持续集成流程  
3. **性能监控:** 添加性能测试和监控
4. **定期执行:** 建立定期测试执行机制

---
*报告生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}*  
*集成测试框架: TestSprite + Playwright*
`;
  }

  async run() {
    try {
      console.log('🌟 开始TestSprite + Playwright集成测试');
      
      await this.ensureDirectories();
      
      const serviceStatus = await this.checkServices();
      const testSpriteAnalysis = await this.analyzeTestSpriteResults();
      const playwrightResults = await this.runPlaywrightTests();
      
      const report = await this.generateReport(serviceStatus, testSpriteAnalysis, playwrightResults);
      
      console.log('\n🎉 集成测试完成！');
      console.log(`📊 查看详细报告: ${this.resultsDir}/integrated-test-report.md`);
      console.log(`📋 JSON数据: ${this.resultsDir}/integrated-test-report.json`);
      
      // 输出简要结果
      const passRate = report.playwright.summary.total > 0 
        ? ((report.playwright.summary.passed / report.playwright.summary.total) * 100).toFixed(1)
        : 0;
      
      console.log(`\n📈 测试结果摘要:`);
      console.log(`   TestSprite计划: ${report.testSprite.summary.totalTests} 个测试用例`);
      console.log(`   Playwright执行: ${report.playwright.summary.passed}/${report.playwright.summary.total} 通过 (${passRate}%)`);
      
    } catch (error) {
      console.error('💥 集成测试执行失败:', error);
      process.exit(1);
    }
  }
}

// 执行集成测试
const runner = new IntegratedTestRunner();
runner.run();