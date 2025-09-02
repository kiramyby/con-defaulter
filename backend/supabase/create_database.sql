-- 违约客户管理系统数据库创建脚本
-- 适用于 Supabase PostgreSQL 数据库
-- 创建时间: 2024-02-11

-- 1. 违约原因表 (default_reasons)
CREATE TABLE default_reasons (
    id BIGSERIAL PRIMARY KEY,
    reason VARCHAR(255) NOT NULL,
    detail TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

COMMENT ON TABLE default_reasons IS '违约原因表';
COMMENT ON COLUMN default_reasons.reason IS '违约原因';
COMMENT ON COLUMN default_reasons.detail IS '详细解释';
COMMENT ON COLUMN default_reasons.enabled IS '是否启用';
COMMENT ON COLUMN default_reasons.sort_order IS '排序序号';
COMMENT ON COLUMN default_reasons.create_time IS '创建时间';
COMMENT ON COLUMN default_reasons.update_time IS '更新时间';
COMMENT ON COLUMN default_reasons.created_by IS '创建人';
COMMENT ON COLUMN default_reasons.updated_by IS '更新人';

-- 2. 客户信息表 (customers)
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    region VARCHAR(100),
    latest_external_rating VARCHAR(10),
    status VARCHAR(20) DEFAULT 'NORMAL' CHECK (status IN ('NORMAL', 'DEFAULT', 'RENEWAL')),
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS '客户信息表';
COMMENT ON COLUMN customers.customer_code IS '客户编码';
COMMENT ON COLUMN customers.customer_name IS '客户名称';
COMMENT ON COLUMN customers.industry IS '所属行业';
COMMENT ON COLUMN customers.region IS '所属区域';
COMMENT ON COLUMN customers.latest_external_rating IS '最新外部评级';
COMMENT ON COLUMN customers.status IS '客户状态';

-- 3. 违约认定申请表 (default_applications)
CREATE TABLE default_applications (
    id BIGSERIAL PRIMARY KEY,
    application_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    latest_external_rating VARCHAR(10),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    remark TEXT,
    applicant VARCHAR(100) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approver VARCHAR(100),
    approve_time TIMESTAMP WITH TIME ZONE,
    approve_remark TEXT,
    
    CONSTRAINT fk_applications_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

COMMENT ON TABLE default_applications IS '违约认定申请表';
COMMENT ON COLUMN default_applications.application_id IS '申请编号';
COMMENT ON COLUMN default_applications.customer_id IS '客户ID';
COMMENT ON COLUMN default_applications.customer_name IS '客户名称';
COMMENT ON COLUMN default_applications.latest_external_rating IS '最新外部评级';
COMMENT ON COLUMN default_applications.severity IS '严重程度';
COMMENT ON COLUMN default_applications.status IS '申请状态';
COMMENT ON COLUMN default_applications.remark IS '备注信息';
COMMENT ON COLUMN default_applications.applicant IS '申请人';
COMMENT ON COLUMN default_applications.create_time IS '申请时间';
COMMENT ON COLUMN default_applications.approver IS '审核人';
COMMENT ON COLUMN default_applications.approve_time IS '审核时间';
COMMENT ON COLUMN default_applications.approve_remark IS '审核意见';

-- 4. 违约申请原因关联表 (application_default_reasons)
CREATE TABLE application_default_reasons (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    default_reason_id BIGINT NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_adr_application FOREIGN KEY (application_id) REFERENCES default_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_adr_reason FOREIGN KEY (default_reason_id) REFERENCES default_reasons(id),
    CONSTRAINT uk_application_reason UNIQUE (application_id, default_reason_id)
);

COMMENT ON TABLE application_default_reasons IS '违约申请原因关联表';
COMMENT ON COLUMN application_default_reasons.application_id IS '申请ID';
COMMENT ON COLUMN application_default_reasons.default_reason_id IS '违约原因ID';

-- 5. 附件表 (attachments)
CREATE TABLE attachments (
    id BIGSERIAL PRIMARY KEY,
    file_id VARCHAR(50) UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    business_type VARCHAR(30) CHECK (business_type IN ('DEFAULT_APPLICATION', 'RENEWAL_APPLICATION')),
    business_id BIGINT,
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100)
);

COMMENT ON TABLE attachments IS '附件表';
COMMENT ON COLUMN attachments.file_id IS '文件ID';
COMMENT ON COLUMN attachments.file_name IS '文件名';
COMMENT ON COLUMN attachments.file_url IS '文件URL';
COMMENT ON COLUMN attachments.file_size IS '文件大小(字节)';
COMMENT ON COLUMN attachments.file_type IS '文件类型';
COMMENT ON COLUMN attachments.business_type IS '业务类型';
COMMENT ON COLUMN attachments.business_id IS '业务ID';
COMMENT ON COLUMN attachments.upload_time IS '上传时间';
COMMENT ON COLUMN attachments.uploaded_by IS '上传人';

-- 6. 违约客户表 (default_customers)
CREATE TABLE default_customers (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    application_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    applicant VARCHAR(100) NOT NULL,
    application_time TIMESTAMP WITH TIME ZONE NOT NULL,
    approver VARCHAR(100) NOT NULL,
    approve_time TIMESTAMP WITH TIME ZONE NOT NULL,
    latest_external_rating VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dc_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_dc_application FOREIGN KEY (application_id) REFERENCES default_applications(id)
);

COMMENT ON TABLE default_customers IS '违约客户表';
COMMENT ON COLUMN default_customers.customer_id IS '客户ID';
COMMENT ON COLUMN default_customers.application_id IS '申请ID';
COMMENT ON COLUMN default_customers.customer_name IS '客户名称';
COMMENT ON COLUMN default_customers.severity IS '严重程度';
COMMENT ON COLUMN default_customers.applicant IS '申请人';
COMMENT ON COLUMN default_customers.application_time IS '申请时间';
COMMENT ON COLUMN default_customers.approver IS '审核人';
COMMENT ON COLUMN default_customers.approve_time IS '审核时间';
COMMENT ON COLUMN default_customers.latest_external_rating IS '最新外部评级';
COMMENT ON COLUMN default_customers.is_active IS '是否有效';

-- 7. 违约客户原因关联表 (default_customer_reasons)
CREATE TABLE default_customer_reasons (
    id BIGSERIAL PRIMARY KEY,
    default_customer_id BIGINT NOT NULL,
    default_reason_id BIGINT NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dcr_customer FOREIGN KEY (default_customer_id) REFERENCES default_customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_dcr_reason FOREIGN KEY (default_reason_id) REFERENCES default_reasons(id),
    CONSTRAINT uk_customer_reason UNIQUE (default_customer_id, default_reason_id)
);

COMMENT ON TABLE default_customer_reasons IS '违约客户原因关联表';
COMMENT ON COLUMN default_customer_reasons.default_customer_id IS '违约客户ID';
COMMENT ON COLUMN default_customer_reasons.default_reason_id IS '违约原因ID';

-- 8. 重生原因表 (renewal_reasons)
CREATE TABLE renewal_reasons (
    id BIGSERIAL PRIMARY KEY,
    reason VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE renewal_reasons IS '重生原因表';
COMMENT ON COLUMN renewal_reasons.reason IS '重生原因';
COMMENT ON COLUMN renewal_reasons.enabled IS '是否启用';
COMMENT ON COLUMN renewal_reasons.sort_order IS '排序序号';

-- 9. 违约重生申请表 (renewals)
CREATE TABLE renewals (
    id BIGSERIAL PRIMARY KEY,
    renewal_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    renewal_reason_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    remark TEXT,
    applicant VARCHAR(100) NOT NULL,
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approver VARCHAR(100),
    approve_time TIMESTAMP WITH TIME ZONE,
    approve_remark TEXT,
    
    CONSTRAINT fk_renewals_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_renewals_reason FOREIGN KEY (renewal_reason_id) REFERENCES renewal_reasons(id)
);

COMMENT ON TABLE renewals IS '违约重生申请表';
COMMENT ON COLUMN renewals.renewal_id IS '重生申请编号';
COMMENT ON COLUMN renewals.customer_id IS '客户ID';
COMMENT ON COLUMN renewals.customer_name IS '客户名称';
COMMENT ON COLUMN renewals.renewal_reason_id IS '重生原因ID';
COMMENT ON COLUMN renewals.status IS '申请状态';
COMMENT ON COLUMN renewals.remark IS '申请备注';
COMMENT ON COLUMN renewals.applicant IS '申请人';
COMMENT ON COLUMN renewals.create_time IS '申请时间';
COMMENT ON COLUMN renewals.approver IS '审核人';
COMMENT ON COLUMN renewals.approve_time IS '审核时间';
COMMENT ON COLUMN renewals.approve_remark IS '审核意见';

-- 10. 用户表 (users)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    real_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'AUDITOR')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    create_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.real_name IS '真实姓名';
COMMENT ON COLUMN users.email IS '邮箱';
COMMENT ON COLUMN users.phone IS '电话';
COMMENT ON COLUMN users.department IS '部门';
COMMENT ON COLUMN users.role IS '角色';
COMMENT ON COLUMN users.status IS '状态';

-- 11. 操作日志表 (operation_logs)
CREATE TABLE operation_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(50),
    operation_type VARCHAR(50) NOT NULL,
    business_type VARCHAR(50),
    business_id BIGINT,
    operation_desc TEXT,
    request_data JSONB,
    response_data JSONB,
    ip_address INET,
    user_agent VARCHAR(500),
    operation_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE operation_logs IS '操作日志表';
COMMENT ON COLUMN operation_logs.user_id IS '操作用户ID';
COMMENT ON COLUMN operation_logs.username IS '操作用户名';
COMMENT ON COLUMN operation_logs.operation_type IS '操作类型';
COMMENT ON COLUMN operation_logs.business_type IS '业务类型';
COMMENT ON COLUMN operation_logs.business_id IS '业务ID';
COMMENT ON COLUMN operation_logs.operation_desc IS '操作描述';
COMMENT ON COLUMN operation_logs.request_data IS '请求数据';
COMMENT ON COLUMN operation_logs.response_data IS '响应数据';
COMMENT ON COLUMN operation_logs.ip_address IS 'IP地址';
COMMENT ON COLUMN operation_logs.user_agent IS '用户代理';
COMMENT ON COLUMN operation_logs.operation_time IS '操作时间';

-- 创建索引
CREATE INDEX idx_default_reasons_enabled ON default_reasons(enabled);
CREATE INDEX idx_default_reasons_sort_order ON default_reasons(sort_order);

CREATE INDEX idx_customers_customer_code ON customers(customer_code);
CREATE INDEX idx_customers_customer_name ON customers(customer_name);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_industry ON customers(industry);
CREATE INDEX idx_customers_region ON customers(region);

CREATE INDEX idx_default_applications_application_id ON default_applications(application_id);
CREATE INDEX idx_default_applications_customer_id ON default_applications(customer_id);
CREATE INDEX idx_default_applications_status ON default_applications(status);
CREATE INDEX idx_default_applications_applicant ON default_applications(applicant);
CREATE INDEX idx_default_applications_create_time ON default_applications(create_time);

CREATE INDEX idx_application_default_reasons_application_id ON application_default_reasons(application_id);

CREATE INDEX idx_attachments_file_id ON attachments(file_id);
CREATE INDEX idx_attachments_business ON attachments(business_type, business_id);

CREATE INDEX idx_default_customers_customer_id ON default_customers(customer_id);
CREATE INDEX idx_default_customers_application_id ON default_customers(application_id);
CREATE INDEX idx_default_customers_applicant ON default_customers(applicant);
CREATE INDEX idx_default_customers_approve_time ON default_customers(approve_time);
CREATE INDEX idx_default_customers_is_active ON default_customers(is_active);

CREATE INDEX idx_default_customer_reasons_default_customer_id ON default_customer_reasons(default_customer_id);

CREATE INDEX idx_renewal_reasons_enabled ON renewal_reasons(enabled);
CREATE INDEX idx_renewal_reasons_sort_order ON renewal_reasons(sort_order);

CREATE INDEX idx_renewals_renewal_id ON renewals(renewal_id);
CREATE INDEX idx_renewals_customer_id ON renewals(customer_id);
CREATE INDEX idx_renewals_status ON renewals(status);
CREATE INDEX idx_renewals_applicant ON renewals(applicant);
CREATE INDEX idx_renewals_create_time ON renewals(create_time);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_operation_type ON operation_logs(operation_type);
CREATE INDEX idx_operation_logs_business ON operation_logs(business_type, business_id);
CREATE INDEX idx_operation_logs_operation_time ON operation_logs(operation_time);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_time_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间的表创建触发器
CREATE TRIGGER update_default_reasons_update_time BEFORE UPDATE ON default_reasons FOR EACH ROW EXECUTE FUNCTION update_updated_time_column();
CREATE TRIGGER update_customers_update_time BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_time_column();
CREATE TRIGGER update_renewal_reasons_update_time BEFORE UPDATE ON renewal_reasons FOR EACH ROW EXECUTE FUNCTION update_updated_time_column();
CREATE TRIGGER update_users_update_time BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_time_column();

-- 插入基础数据
-- 违约原因基础数据
INSERT INTO default_reasons (reason, detail, enabled, sort_order, created_by) VALUES
('头寸缺口过多', '6个月内，交易对手技术性或资金等原因，给当天结算带来头寸缺口2次以上', TRUE, 1, 'system'),
('技术性违约', '因系统技术故障导致的违约行为', TRUE, 2, 'system'),
('资金违约', '因资金链问题导致的违约行为', TRUE, 3, 'system'),
('信用违约', '因信用问题导致的违约行为', TRUE, 4, 'system'),
('操作违约', '因操作失误导致的违约行为', TRUE, 5, 'system');

-- 重生原因基础数据
INSERT INTO renewal_reasons (reason, enabled, sort_order) VALUES
('正常结算后解除', TRUE, 1),
('在其他金融机构违约解除，或外部评级显示为非违约级别', TRUE, 2),
('客户信用状况改善', TRUE, 3),
('技术问题已解决', TRUE, 4);

-- 用户基础数据
INSERT INTO users (username, real_name, email, department, role, status) VALUES
('admin', '系统管理员', 'admin@company.com', 'IT部门', 'ADMIN', 'ACTIVE'),
('operator1', '操作员一号', 'op1@company.com', '业务部门', 'OPERATOR', 'ACTIVE'),
('auditor1', '审核员一号', 'auditor1@company.com', '风控部门', 'AUDITOR', 'ACTIVE');

-- 示例客户数据
INSERT INTO customers (customer_code, customer_name, industry, region, latest_external_rating, status) VALUES
('CUST001', '示例金融公司', '金融业', '华东地区', 'A+', 'NORMAL'),
('CUST002', '示例制造企业', '制造业', '华南地区', 'BBB', 'NORMAL');

-- 创建函数：获取申请的违约原因ID数组
CREATE OR REPLACE FUNCTION get_application_default_reason_ids(app_id BIGINT)
RETURNS INTEGER[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT adr.default_reason_id::INTEGER
        FROM application_default_reasons adr
        WHERE adr.application_id = app_id
        ORDER BY adr.default_reason_id
    );
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取违约客户的违约原因ID数组  
CREATE OR REPLACE FUNCTION get_default_customer_reason_ids(dc_id BIGINT)
RETURNS INTEGER[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT dcr.default_reason_id::INTEGER
        FROM default_customer_reasons dcr
        WHERE dcr.default_customer_id = dc_id
        ORDER BY dcr.default_reason_id
    );
END;
$$ LANGUAGE plpgsql;

-- 创建函数：自动生成客户编码
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_code VARCHAR(50);
    max_num INTEGER;
BEGIN
    -- 获取当前最大编号
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) + 1
    INTO max_num
    FROM customers
    WHERE customer_code LIKE 'CUST%';
    
    -- 生成新编码
    new_code := 'CUST' || LPAD(max_num::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;