-- 测试数据插入脚本
-- 用于违约客户管理系统的测试数据
-- 适配Prisma重置后的数据库结构

-- 0. 确保基础违约原因和续期原因数据存在
-- 只有当表为空或记录不足时才插入
DO $$
BEGIN
    -- 检查违约原因表，如果记录不足5条则插入基础数据
    IF (SELECT COUNT(*) FROM default_reasons) < 5 THEN
        INSERT INTO default_reasons (reason, detail, enabled, sort_order, created_by) VALUES
        ('技术性违约', '因系统技术故障导致的违约行为', TRUE, 1, 'system'),
        ('资金违约', '因资金链问题导致的违约行为', TRUE, 2, 'system'),
        ('信用违约', '因信用问题导致的违约行为', TRUE, 3, 'system'),
        ('操作违约', '因操作失误导致的违约行为', TRUE, 4, 'system'),
        ('头寸缺口过多', '6个月内，交易对手技术性或资金等原因，给当天结算带来头寸缺口2次以上', TRUE, 5, 'system');
    END IF;

    -- 检查续期原因表，如果记录不足4条则插入基础数据
    IF (SELECT COUNT(*) FROM renewal_reasons) < 4 THEN
        INSERT INTO renewal_reasons (reason, enabled, sort_order) VALUES
        ('正常结算后解除', TRUE, 1),
        ('在其他金融机构违约解除，或外部评级显示为非违约级别', TRUE, 2),
        ('客户信用状况改善', TRUE, 3),
        ('技术问题已解决', TRUE, 4);
    END IF;
END $$;

-- 1. 清空现有测试数据 (按依赖关系顺序)
DELETE FROM operation_logs WHERE username LIKE 'test_%';
DELETE FROM default_customer_reasons WHERE default_customer_id IN (SELECT id FROM default_customers WHERE applicant LIKE 'test_%');
DELETE FROM application_default_reasons WHERE application_id IN (SELECT id FROM default_applications WHERE applicant LIKE 'test_%');
DELETE FROM attachments WHERE uploaded_by LIKE 'test_%';
DELETE FROM renewals WHERE applicant LIKE 'test_%';
DELETE FROM default_customers WHERE applicant LIKE 'test_%';
DELETE FROM default_applications WHERE applicant LIKE 'test_%';
DELETE FROM customers WHERE customer_code LIKE 'TEST%';
DELETE FROM users WHERE username LIKE 'test_%';

-- 2. 插入测试用户（密码均为：Test123456）
INSERT INTO users (username, real_name, email, phone, department, role, status, hashed_password, created_by) VALUES
('test_admin', '测试管理员', 'test.admin@example.com', '13800000001', '测试部门', 'ADMIN', 'ACTIVE', '$2b$10$Q0g1Mbq/VZ2Sj4yVVJ2jAeDpyprn1fac3wtqq5ynZb7u5en7PU/PS', 'system'),
('test_operator', '测试操作员', 'test.operator@example.com', '13800000002', '业务部门', 'OPERATOR', 'ACTIVE', '$2b$10$Q0g1Mbq/VZ2Sj4yVVJ2jAeDpyprn1fac3wtqq5ynZb7u5en7PU/PS', 'system'),
('test_auditor', '测试审核员', 'test.auditor@example.com', '13800000003', '风控部门', 'AUDITOR', 'ACTIVE', '$2b$10$Q0g1Mbq/VZ2Sj4yVVJ2jAeDpyprn1fac3wtqq5ynZb7u5en7PU/PS', 'system'),
('test_user1', '测试用户1', 'test.user1@example.com', '13800000004', '业务部门', 'OPERATOR', 'ACTIVE', '$2b$10$Q0g1Mbq/VZ2Sj4yVVJ2jAeDpyprn1fac3wtqq5ynZb7u5en7PU/PS', 'system'),
('test_user2', '测试用户2', 'test.user2@example.com', '13800000005', '业务部门', 'AUDITOR', 'INACTIVE', '$2b$10$Q0g1Mbq/VZ2Sj4yVVJ2jAeDpyprn1fac3wtqq5ynZb7u5en7PU/PS', 'system');

-- 3. 插入测试客户
INSERT INTO customers (customer_code, customer_name, industry, region, latest_external_rating, status) VALUES
('TEST001', '测试科技有限公司', '科技行业', '华东地区', 'AAA', 'NORMAL'),
('TEST002', '测试制造企业', '制造业', '华南地区', 'AA', 'NORMAL'),
('TEST003', '测试金融公司', '金融业', '华北地区', 'A+', 'DEFAULT'),
('TEST004', '测试贸易公司', '贸易行业', '西南地区', 'BBB', 'NORMAL'),
('TEST005', '测试建筑公司', '建筑业', '华中地区', 'BB', 'RENEWAL'),
('TEST006', '测试能源公司', '能源行业', '东北地区', 'B+', 'DEFAULT'),
('TEST007', '测试医疗公司', '医疗行业', '华东地区', 'A', 'NORMAL');

-- 4. 插入测试违约申请
INSERT INTO default_applications (
    application_id, customer_id, customer_name, latest_external_rating, 
    severity, status, remark, applicant, approver, approve_time, approve_remark
) VALUES
-- 待审批的申请
('APP2024001', (SELECT id FROM customers WHERE customer_code = 'TEST001'), '测试科技有限公司', 'AAA', 'LOW', 'PENDING', '技术性违约，需要审核', 'test_operator', NULL, NULL, NULL),
('APP2024002', (SELECT id FROM customers WHERE customer_code = 'TEST002'), '测试制造企业', 'AA', 'MEDIUM', 'PENDING', '资金违约问题', 'test_user1', NULL, NULL, NULL),
-- 已批准的申请
('APP2024003', (SELECT id FROM customers WHERE customer_code = 'TEST003'), '测试金融公司', 'A+', 'HIGH', 'APPROVED', '严重信用违约', 'test_operator', 'test_auditor', NOW() - INTERVAL '1 day', '审核通过，同意违约认定'),
('APP2024004', (SELECT id FROM customers WHERE customer_code = 'TEST004'), '测试贸易公司', 'BBB', 'MEDIUM', 'APPROVED', '操作违约', 'test_user1', 'test_auditor', NOW() - INTERVAL '2 days', '符合违约标准'),
-- 已拒绝的申请
('APP2024005', (SELECT id FROM customers WHERE customer_code = 'TEST005'), '测试建筑公司', 'BB', 'LOW', 'REJECTED', '轻微技术问题', 'test_operator', 'test_auditor', NOW() - INTERVAL '3 days', '不符合违约标准，拒绝申请');

-- 5. 插入申请与违约原因的关联 (安全的关联方式)
INSERT INTO application_default_reasons (application_id, default_reason_id)
SELECT app.id, dr.id
FROM (
    SELECT id, application_id, 
           ROW_NUMBER() OVER (ORDER BY id) as rn
    FROM default_applications 
    WHERE application_id IN ('APP2024001', 'APP2024002', 'APP2024003', 'APP2024004', 'APP2024005')
) app
CROSS JOIN (
    SELECT id, 
           ROW_NUMBER() OVER (ORDER BY id) as rn
    FROM default_reasons 
    WHERE enabled = TRUE
    LIMIT 5
) dr
WHERE 
    -- APP2024001 使用第1个原因
    (app.application_id = 'APP2024001' AND dr.rn = 1) OR
    -- APP2024002 使用第1和第2个原因
    (app.application_id = 'APP2024002' AND dr.rn IN (1, 2)) OR
    -- APP2024003 使用第2和第3个原因
    (app.application_id = 'APP2024003' AND dr.rn IN (2, 3)) OR
    -- APP2024004 使用第3个原因
    (app.application_id = 'APP2024004' AND dr.rn = 3) OR
    -- APP2024005 使用第1个原因
    (app.application_id = 'APP2024005' AND dr.rn = 1);

-- 6. 插入违约客户记录（基于已批准的申请）
INSERT INTO default_customers (
    customer_id, application_id, customer_name, severity, 
    applicant, application_time, approver, approve_time, latest_external_rating, is_active
) VALUES
((SELECT customer_id FROM default_applications WHERE application_id = 'APP2024003'),
 (SELECT id FROM default_applications WHERE application_id = 'APP2024003'),
 '测试金融公司', 'HIGH', 'test_operator', 
 (SELECT create_time FROM default_applications WHERE application_id = 'APP2024003'),
 'test_auditor', 
 (SELECT approve_time FROM default_applications WHERE application_id = 'APP2024003'),
 'A+', true),
((SELECT customer_id FROM default_applications WHERE application_id = 'APP2024004'),
 (SELECT id FROM default_applications WHERE application_id = 'APP2024004'),
 '测试贸易公司', 'MEDIUM', 'test_user1', 
 (SELECT create_time FROM default_applications WHERE application_id = 'APP2024004'),
 'test_auditor', 
 (SELECT approve_time FROM default_applications WHERE application_id = 'APP2024004'),
 'BBB', true);

-- 7. 插入违约客户与违约原因的关联 (安全的关联方式)
INSERT INTO default_customer_reasons (default_customer_id, default_reason_id)
SELECT dc.id, dr.id
FROM default_customers dc
CROSS JOIN (
    SELECT id, 
           ROW_NUMBER() OVER (ORDER BY id) as rn
    FROM default_reasons 
    WHERE enabled = TRUE
    LIMIT 5
) dr
WHERE 
    -- 测试金融公司 (TEST003) 使用第2和第3个原因
    (dc.customer_id = (SELECT id FROM customers WHERE customer_code = 'TEST003') AND dr.rn IN (2, 3)) OR
    -- 测试贸易公司 (TEST004) 使用第3个原因  
    (dc.customer_id = (SELECT id FROM customers WHERE customer_code = 'TEST004') AND dr.rn = 3);

-- 8. 插入测试续期申请
INSERT INTO renewals (
    renewal_id, customer_id, customer_name, renewal_reason_id,
    status, remark, applicant, approver, approve_time, approve_remark
) VALUES
-- 使用安全的续期原因关联
('REN2024001', (SELECT id FROM customers WHERE customer_code = 'TEST003'), '测试金融公司', 
 (SELECT id FROM renewal_reasons WHERE enabled = TRUE ORDER BY id LIMIT 1), 'PENDING', 
 '客户已改善信用状况，申请解除违约', 'test_operator', NULL, NULL, NULL),
('REN2024002', (SELECT id FROM customers WHERE customer_code = 'TEST006'), '测试能源公司', 
 (SELECT COALESCE(
    (SELECT id FROM renewal_reasons WHERE enabled = TRUE ORDER BY id OFFSET 1 LIMIT 1),
    (SELECT id FROM renewal_reasons WHERE enabled = TRUE ORDER BY id LIMIT 1)
 )), 'APPROVED', 
 '违约问题已解决', 'test_user1', 'test_auditor', NOW() - INTERVAL '1 day', 
 '确认违约问题已解决，同意续期'),
('REN2024003', (SELECT id FROM customers WHERE customer_code = 'TEST004'), '测试贸易公司', 
 (SELECT COALESCE(
    (SELECT id FROM renewal_reasons WHERE enabled = TRUE ORDER BY id OFFSET 2 LIMIT 1),
    (SELECT id FROM renewal_reasons WHERE enabled = TRUE ORDER BY id LIMIT 1)
 )), 'REJECTED', 
 '技术问题修复申请', 'test_operator', 'test_auditor', NOW() - INTERVAL '2 days', 
 '问题未完全解决，拒绝续期申请');

-- 9. 插入测试附件
INSERT INTO attachments (
    file_id, file_name, file_url, file_size, file_type, 
    business_type, business_id, uploaded_by
) VALUES
('FILE001', '违约证明文件.pdf', 'https://files.example.com/FILE001.pdf', 1024000, 'application/pdf', 
 'DEFAULT_APPLICATION', (SELECT id FROM default_applications WHERE application_id = 'APP2024001'), 'test_operator'),
('FILE002', '财务报表.xlsx', 'https://files.example.com/FILE002.xlsx', 2048000, 'application/vnd.ms-excel', 
 'DEFAULT_APPLICATION', (SELECT id FROM default_applications WHERE application_id = 'APP2024002'), 'test_user1'),
('FILE003', '审计报告.pdf', 'https://files.example.com/FILE003.pdf', 1536000, 'application/pdf', 
 'DEFAULT_APPLICATION', (SELECT id FROM default_applications WHERE application_id = 'APP2024003'), 'test_operator'),
('FILE004', '续期申请材料.docx', 'https://files.example.com/FILE004.docx', 512000, 'application/vnd.ms-word', 
 'RENEWAL_APPLICATION', (SELECT id FROM renewals WHERE renewal_id = 'REN2024001'), 'test_operator');

-- 10. 插入测试操作日志
INSERT INTO operation_logs (
    username, operation_type, business_type, business_id, 
    operation_desc, request_data, response_data, ip_address, user_agent
) VALUES
('test_operator', 'CREATE', 'DEFAULT_APPLICATION', (SELECT id FROM default_applications WHERE application_id = 'APP2024001'), 
 '创建违约申请', '{"customerName": "测试科技有限公司", "severity": "LOW", "defaultReasons": [2]}', '{"code": 200, "message": "申请提交成功", "data": {"applicationId": "APP2024001"}}', '127.0.0.1', 'Mozilla/5.0 测试浏览器'),
('test_auditor', 'APPROVE', 'DEFAULT_APPLICATION', (SELECT id FROM default_applications WHERE application_id = 'APP2024003'), 
 '审批违约申请', '{"approved": true, "remark": "审核通过，同意违约认定"}', '{"code": 200, "message": "审核完成"}', '127.0.0.1', 'Mozilla/5.0 测试浏览器'),
('test_operator', 'CREATE', 'RENEWAL_APPLICATION', (SELECT id FROM renewals WHERE renewal_id = 'REN2024001'), 
 '创建续期申请', '{"customerId": 3, "renewalReason": 3, "remark": "客户已改善信用状况"}', '{"code": 200, "message": "重生申请提交成功"}', '127.0.0.1', 'Mozilla/5.0 测试浏览器'),
('test_user1', 'VIEW', 'CUSTOMER', (SELECT id FROM customers WHERE customer_code = 'TEST001'), 
 '查看客户信息', NULL, '{"code": 200, "message": "success"}', '127.0.0.1', 'Mozilla/5.0 测试浏览器'),
('test_admin', 'CREATE', 'USER', NULL, 
 '创建用户账户', '{"username": "test_user1", "role": "OPERATOR"}', '{"code": 200, "message": "用户创建成功"}', '127.0.0.1', 'Mozilla/5.0 测试浏览器');

-- 11. 验证插入的数据
SELECT '测试数据汇总' as description;

SELECT 'Users' as table_name, count(*) as count FROM users WHERE username LIKE 'test_%'
UNION ALL
SELECT 'Customers', count(*) FROM customers WHERE customer_code LIKE 'TEST%'
UNION ALL
SELECT 'Applications', count(*) FROM default_applications WHERE applicant LIKE 'test_%'
UNION ALL
SELECT 'Default Customers', count(*) FROM default_customers WHERE applicant LIKE 'test_%'
UNION ALL
SELECT 'Renewals', count(*) FROM renewals WHERE applicant LIKE 'test_%'
UNION ALL
SELECT 'Attachments', count(*) FROM attachments WHERE uploaded_by LIKE 'test_%'
UNION ALL
SELECT 'Operation Logs', count(*) FROM operation_logs WHERE username LIKE 'test_%';

-- 12. API响应格式测试查询示例
SELECT 
    'API响应格式测试' as description,
    json_build_object(
        'code', 200,
        'message', 'success',
        'data', json_build_object(
            'total', count(*),
            'page', 1,
            'size', 10,
            'list', json_agg(
                json_build_object(
                    'id', id,
                    'reason', reason,
                    'detail', detail,
                    'enabled', enabled,
                    'sortOrder', sort_order,
                    'createTime', create_time,
                    'updateTime', update_time
                )
            )
        ),
        'timestamp', now()
    ) as sample_response
FROM default_reasons 
WHERE enabled = true
LIMIT 3;

-- 重要提醒：
-- 1. 此脚本基于Prisma重置后的数据库结构
-- 2. 使用了正确的枚举值 (ADMIN, OPERATOR, AUDITOR, ACTIVE, INACTIVE等)
-- 3. 测试用户需要先在Supabase认证系统中创建对应的认证账户
-- 4. 所有测试数据都以'test_'或'TEST'前缀，便于清理