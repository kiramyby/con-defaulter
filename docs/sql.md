
## 数据表设计

### 1. 违约原因表 (default_reasons)

```sql
CREATE TABLE default_reasons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reason VARCHAR(255) NOT NULL COMMENT '违约原因',
    detail TEXT NOT NULL COMMENT '详细解释',
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序序号',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(100) COMMENT '创建人',
    updated_by VARCHAR(100) COMMENT '更新人'
);
```

**字段说明**：
- `id`: 主键，自增长
- `reason`: 违约原因名称
- `detail`: 详细描述
- `enabled`: 启用状态
- `sort_order`: 用于前端显示排序

### 2. 客户信息表 (customers)

```sql
CREATE TABLE customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_code VARCHAR(50) UNIQUE NOT NULL COMMENT '客户编码',
    customer_name VARCHAR(255) NOT NULL COMMENT '客户名称',
    industry VARCHAR(100) COMMENT '所属行业',
    region VARCHAR(100) COMMENT '所属区域',
    latest_external_rating VARCHAR(10) COMMENT '最新外部评级',
    status ENUM('NORMAL', 'DEFAULT', 'RENEWAL') DEFAULT 'NORMAL' COMMENT '客户状态',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer_code (customer_code),
    INDEX idx_customer_name (customer_name),
    INDEX idx_status (status),
    INDEX idx_industry (industry),
    INDEX idx_region (region)
);
```

### 3. 违约认定申请表 (default_applications)

```sql
CREATE TABLE default_applications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id VARCHAR(50) UNIQUE NOT NULL COMMENT '申请编号',
    customer_id BIGINT NOT NULL COMMENT '客户ID',
    customer_name VARCHAR(255) NOT NULL COMMENT '客户名称',
    latest_external_rating VARCHAR(10) COMMENT '最新外部评级',
    severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL COMMENT '严重程度',
    approved BOOLEAN NOT NULL COMMENT '申请状态',
    remark TEXT COMMENT '备注信息',
    applicant VARCHAR(100) NOT NULL COMMENT '申请人',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
    approver VARCHAR(100) COMMENT '审核人',
    approve_time TIMESTAMP NULL COMMENT '审核时间',
    approve_remark TEXT COMMENT '审核意见',
    
    FOREIGN KEY fk_applications_customer (customer_id) REFERENCES customers(id),
    INDEX idx_application_id (application_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (approved),
    INDEX idx_applicant (applicant),
    INDEX idx_create_time (create_time)
);
```

### 4. 违约申请原因关联表 (application_default_reasons)

```sql
CREATE TABLE application_default_reasons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id BIGINT NOT NULL COMMENT '申请ID',
    default_reason_id BIGINT NOT NULL COMMENT '违约原因ID',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY fk_adr_application (application_id) REFERENCES default_applications(id) ON DELETE CASCADE,
    FOREIGN KEY fk_adr_reason (default_reason_id) REFERENCES default_reasons(id),
    UNIQUE KEY uk_application_reason (application_id, default_reason_id),
    INDEX idx_application_id (application_id)
);
```

### 5. 附件表 (attachments)

```sql
CREATE TABLE attachments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    file_id VARCHAR(50) UNIQUE NOT NULL COMMENT '文件ID',
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_url VARCHAR(500) NOT NULL COMMENT '文件URL',
    file_size BIGINT NOT NULL COMMENT '文件大小(字节)',
    file_type VARCHAR(50) COMMENT '文件类型',
    business_type ENUM('DEFAULT_APPLICATION', 'RENEWAL_APPLICATION') COMMENT '业务类型',
    business_id BIGINT COMMENT '业务ID',
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    uploaded_by VARCHAR(100) COMMENT '上传人',
    
    INDEX idx_file_id (file_id),
    INDEX idx_business (business_type, business_id)
);
```

### 6. 违约客户表 (default_customers)

```sql
CREATE TABLE default_customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL COMMENT '客户ID',
    application_id BIGINT NOT NULL COMMENT '申请ID',
    customer_name VARCHAR(255) NOT NULL COMMENT '客户名称',
    severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL COMMENT '严重程度',
    applicant VARCHAR(100) NOT NULL COMMENT '申请人',
    application_time TIMESTAMP NOT NULL COMMENT '申请时间',
    approver VARCHAR(100) NOT NULL COMMENT '审核人',
    approve_time TIMESTAMP NOT NULL COMMENT '审核时间',
    latest_external_rating VARCHAR(10) COMMENT '最新外部评级',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否有效',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY fk_dc_customer (customer_id) REFERENCES customers(id),
    FOREIGN KEY fk_dc_application (application_id) REFERENCES default_applications(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_application_id (application_id),
    INDEX idx_applicant (applicant),
    INDEX idx_approve_time (approve_time),
    INDEX idx_is_active (is_active)
);
```

### 7. 违约客户原因关联表 (default_customer_reasons)

```sql
CREATE TABLE default_customer_reasons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    default_customer_id BIGINT NOT NULL COMMENT '违约客户ID',
    default_reason_id BIGINT NOT NULL COMMENT '违约原因ID',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY fk_dcr_customer (default_customer_id) REFERENCES default_customers(id) ON DELETE CASCADE,
    FOREIGN KEY fk_dcr_reason (default_reason_id) REFERENCES default_reasons(id),
    UNIQUE KEY uk_customer_reason (default_customer_id, default_reason_id),
    INDEX idx_default_customer_id (default_customer_id)
);
```

### 8. 重生原因表 (renewal_reasons)

```sql
CREATE TABLE renewal_reasons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reason VARCHAR(255) NOT NULL COMMENT '重生原因',
    enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_enabled (enabled),
    INDEX idx_sort_order (sort_order)
);
```

### 9. 违约重生申请表 (renewals)

```sql
CREATE TABLE renewals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    renewal_id VARCHAR(50) UNIQUE NOT NULL COMMENT '重生申请编号',
    customer_id BIGINT NOT NULL COMMENT '客户ID',
    customer_name VARCHAR(255) NOT NULL COMMENT '客户名称',
    renewal_reason_id BIGINT NOT NULL COMMENT '重生原因ID',
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING' COMMENT '申请状态',
    remark TEXT COMMENT '申请备注',
    applicant VARCHAR(100) NOT NULL COMMENT '申请人',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
    approver VARCHAR(100) COMMENT '审核人',
    approve_time TIMESTAMP NULL COMMENT '审核时间',
    approve_remark TEXT COMMENT '审核意见',
    
    FOREIGN KEY fk_renewals_customer (customer_id) REFERENCES customers(id),
    FOREIGN KEY fk_renewals_reason (renewal_reason_id) REFERENCES renewal_reasons(id),
    INDEX idx_renewal_id (renewal_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_applicant (applicant),
    INDEX idx_create_time (create_time)
);
```

### 10. 用户表 (users)

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    real_name VARCHAR(100) NOT NULL COMMENT '真实姓名',
    email VARCHAR(100) COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '电话',
    department VARCHAR(100) COMMENT '部门',
    role ENUM('ADMIN', 'OPERATOR', 'AUDITOR') NOT NULL COMMENT '角色',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' COMMENT '状态',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
);
```

### 11. 操作日志表 (operation_logs)

```sql
CREATE TABLE operation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT COMMENT '操作用户ID',
    username VARCHAR(50) COMMENT '操作用户名',
    operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
    business_type VARCHAR(50) COMMENT '业务类型',
    business_id BIGINT COMMENT '业务ID',
    operation_desc TEXT COMMENT '操作描述',
    request_data JSON COMMENT '请求数据',
    response_data JSON COMMENT '响应数据',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent VARCHAR(500) COMMENT '用户代理',
    operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    
    INDEX idx_user_id (user_id),
    INDEX idx_operation_type (operation_type),
    INDEX idx_business (business_type, business_id),
    INDEX idx_operation_time (operation_time)
);
```

##  数据字典

###  枚举值定义

#### 客户状态 (Customer Status)
- `NORMAL`: 正常
- `DEFAULT`: 违约
- `RENEWAL`: 重生

#### 严重程度 (Severity)
- `LOW`: 低
- `MEDIUM`: 中
- `HIGH`: 高

#### 用户角色 (User Role)
- `ADMIN`: 管理员
- `OPERATOR`: 操作员
- `AUDITOR`: 审核员

### 演示数据
#### 插入违约原因基础数据
```sql
INSERT INTO default_reasons (reason, detail, enabled, sort_order, created_by) VALUES
('头寸缺口过多', '6 个月内，交易对手技术性或资金等原因，给当天结算带来头寸缺口 2 次以上', TRUE, 1, 'system'),
('技术性违约', '因系统技术故障导致的违约行为', TRUE, 2, 'system'),
('资金违约', '因资金链问题导致的违约行为', TRUE, 3, 'system'),
('信用违约', '因信用问题导致的违约行为', TRUE, 4, 'system'),
('操作违约', '因操作失误导致的违约行为', TRUE, 5, 'system');
```

#### 插入重生原因基础数据
```sql
INSERT INTO renewal_reasons (reason, enabled, sort_order) VALUES
('正常结算后解除', TRUE, 1),
('在其他金融机构违约解除，或外部评级显示为非违约级别', TRUE, 2),
('客户信用状况改善', TRUE, 3),
('技术问题已解决', TRUE, 4);
```

#### 插入用户基础数据
```sql
INSERT INTO users (username, real_name, email, department, role, status) VALUES
('admin', '系统管理员', ' admin@company.com ', 'IT 部门', 'ADMIN', 'ACTIVE'),
('operator 1', '操作员一号', ' op1@company.com ', '业务部门', 'OPERATOR', 'ACTIVE'),
('auditor 1', '审核员一号', ' auditor1@company.com ', '风控部门', 'AUDITOR', 'ACTIVE');
```

## API语句
#### 2.1 查询违约原因列表
```sql
SELECT 
    Id,
    Reason,
    Detail,
    Enabled,
    Sort_order,
    Create_time,
    Update_time
FROM default_reasons 
WHERE enabled = ? 
ORDER BY sort_order ASC, id ASC
LIMIT ? OFFSET ?;
```

#### 获取违约原因总数
 ```sql
SELECT COUNT(*) as total 
FROM default_reasons 
WHERE enabled = ?;
```

#### 2.2 新增违约原因
```
INSERT INTO default_reasons (reason, detail, enabled, sort_order, created_by) 
VALUES (?, ?, ?, ?, ?);
```

#### 2.3 更新违约原因
```
UPDATE default_reasons 
SET reason = ?, 
    Detail = ?, 
    Enabled = ?, 
    Sort_order = ?,
    Updated_by = ?,
    Update_time = CURRENT_TIMESTAMP
WHERE id = ?;
```

#### 2.4 删除违约原因
```
DELETE FROM default_reasons WHERE id = ?;
```

#### 3.1 提交违约认定申请
##### 插入申请记录
 ```sql
INSERT INTO default_applications (
    Application_id, customer_id, customer_name, latest_external_rating,
    Severity, approved, remark, applicant, create_time
) VALUES (?, ?, ?, ?, ?, false, ?, ?, CURRENT_TIMESTAMP);
```

#####   插入申请关联的违约原因
```sql
INSERT INTO application_default_reasons (application_id, default_reason_id)
VALUES 
    ((SELECT id FROM default_applications WHERE application_id = ?), ?),
    ((SELECT id FROM default_applications WHERE application_id = ?), ?);
```

#####     插入附件信息
```sql
INSERT INTO attachments (
    File_id, file_name, file_url, file_size, file_type,
    Business_type, business_id, uploaded_by
) VALUES (?, ?, ?, ?, ?, 'DEFAULT_APPLICATION', 
    (SELECT id FROM default_applications WHERE application_id = ?), ?);
```

#### 3.2 查询违约认定申请列表
```sql
SELECT 
    Da. Application_id,
    Da. Customer_name,
    Da. Applicant,
    Da. approved,
    Da. Severity,
    Da. Create_time,
    Da. Latest_external_rating,
    GROUP_CONCAT (dr. Reason SEPARATOR ', ') as default_reasons
FROM default_applications da
LEFT JOIN application_default_reasons adr ON da. Id = adr. Application_id
LEFT JOIN default_reasons dr ON adr. Default_reason_id = dr. Id
WHERE 1=1
    AND (? IS NULL OR da. Customer_name LIKE CONCAT ('%', ?, '%'))
    AND (? IS NULL OR da. approved = ?)
    AND (? IS NULL OR da. Applicant = ?)
    AND (? IS NULL OR da. Severity = ?)
    AND (? IS NULL OR DATE (da. Create_time) >= ?)
    AND (? IS NULL OR DATE (da. Create_time) <= ?)
GROUP BY da. Id
ORDER BY da. Create_time DESC
LIMIT ? OFFSET ?;
```
##### 获取申请总数
```sql
SELECT COUNT (DISTINCT da. Id) as total
FROM default_applications da
WHERE 1=1
    AND (? IS NULL OR da. Customer_name LIKE CONCAT ('%', ?, '%'))
    AND (? IS NULL OR da. Status = ?)
    AND (? IS NULL OR da. Applicant = ?)
    AND (? IS NULL OR da. Severity = ?)
    AND (? IS NULL OR DATE (da. Create_time) >= ?)
    AND (? IS NULL OR DATE (da. Create_time) <= ?);
```

####      3.3 获取违约认定申请详情
```sql
SELECT 
    Da. Application_id,
    Da. Customer_name,
    Da. Latest_external_rating,
    Da. Severity,
    Da. Remark,
    Da. Applicant,
    Da. approved,
    Da. Create_time,
    Da. Approve_time,
    Da. Approver,
    Da. Approve_remark
FROM default_applications da
WHERE da. Application_id = ?;
```

##### 获取申请关联的违约原因
```sql
SELECT 
    Dr. Id,
    Dr. Reason,
    Dr. Detail
FROM default_reasons dr
JOIN application_default_reasons adr ON dr. Id = adr. Default_reason_id
JOIN default_applications da ON adr. Application_id = da. Id
WHERE da. Application_id = ?;
```

#####      获取申请附件 
```sql
SELECT 
    File_name,
    File_url,
    File_size
FROM attachments
WHERE business_type = 'DEFAULT_APPLICATION' 
    AND business_id = (SELECT id FROM default_applications WHERE application_id = ?);
```

####  4.1 审核违约认定申请
```sql
UPDATE default_applications 
SET approved = ?,
    Approver = ?,
    Approve_time = CURRENT_TIMESTAMP,
    Approve_remark = ?
WHERE application_id = ?;
```

#####     如果审核通过，创建违约客户记录
```sql
INSERT INTO default_customers (
    Customer_id, application_id, customer_name, severity,
    Applicant, application_time, approver, approve_time,
    Latest_external_rating, is_active
)
SELECT 
    Da. Customer_id,
    Da. Id,
    Da. Customer_name,
    Da. Severity,
    Da. Applicant,
    Da. Create_time,
    Da. Approver,
    Da. Approve_time,
    Da. Latest_external_rating,
    TRUE
FROM default_applications da
WHERE da.Application_id = ? AND da.approved = TRUE;
```

##### 创建违约客户原因关联
```sql
INSERT INTO default_customer_reasons (default_customer_id, default_reason_id)
SELECT 
    Dc. Id,
    Adr. Default_reason_id
FROM default_customers dc
JOIN default_applications da ON dc. Application_id = da. Id
JOIN application_default_reasons adr ON da. Id = adr. Application_id
WHERE da. Application_id = ?;
```

#####  更新客户状态为违约
```sql
UPDATE customers 
SET status = 'DEFAULT', 
    Update_time = CURRENT_TIMESTAMP
WHERE id = (SELECT customer_id FROM default_applications WHERE application_id = ?);
```

####   4.2 批量审核 - 通过事务处理多个申请
```sql

START TRANSACTION;

-- 批量更新申请状态（需要在程序中循环执行）
UPDATE default_applications 
SET approved = ?,
    Approver = ?,
    Approve_time = CURRENT_TIMESTAMP,
    Approve_remark = ?
WHERE application_id = ?;

COMMIT;
```

####   5.1 查询违约客户列表
```SQL
SELECT 
    Dc. Customer_id,
    Dc. Customer_name,
    'DEFAULT' as status,
    GROUP_CONCAT (dr. Reason SEPARATOR ', ') as default_reasons,
    Dc. Severity,
    Dc. Applicant,
    Dc. Application_time,
    Dc. Approve_time,
    Dc. Latest_external_rating
FROM default_customers dc
LEFT JOIN default_customer_reasons dcr ON dc. Id = dcr. Default_customer_id
LEFT JOIN default_reasons dr ON dcr. Default_reason_id = dr. Id
WHERE dc. Is_active = TRUE
    AND (? IS NULL OR dc. Customer_name LIKE CONCAT ('%', ?, '%'))
    AND (? IS NULL OR dc. Severity = ?)
    AND (? IS NULL OR dc. Applicant = ?)
    AND (? IS NULL OR DATE (dc. Application_time) >= ?)
    AND (? IS NULL OR DATE (dc. Application_time) <= ?)
GROUP BY dc. Id
ORDER BY dc. Approve_time DESC
LIMIT ? OFFSET ?;
```

#####      获取违约客户总数
```SQL
SELECT COUNT (*) as total
FROM default_customers dc
WHERE dc. Is_active = TRUE
    AND (? IS NULL OR dc. Customer_name LIKE CONCAT ('%', ?, '%'))
    AND (? IS NULL OR dc. Severity = ?)
    AND (? IS NULL OR dc. Applicant = ?)
    AND (? IS NULL OR DATE (dc. Application_time) >= ?)
    AND (? IS NULL OR DATE (dc. Application_time) <= ?);
```


####      6.1 查询可重生客户列表
```SQL
SELECT 
    Dc. Customer_id,
    Dc. Customer_name,
    GROUP_CONCAT (dr. Reason SEPARATOR ', ') as default_reasons,
    Dc. Severity,
    Dc. Applicant,
    Dc. Application_time,
    Dc. Approve_time,
    Dc. Latest_external_rating
FROM default_customers dc
LEFT JOIN default_customer_reasons dcr ON dc. Id = dcr. Default_customer_id
LEFT JOIN default_reasons dr ON dcr. Default_reason_id = dr. Id
WHERE dc. Is_active = TRUE
    AND dc. Customer_id NOT IN (
        SELECT customer_id FROM renewals 
        WHERE status = 'PENDING'
    )
GROUP BY dc. Id
ORDER BY dc. Approve_time DESC
LIMIT ? OFFSET ?;
```
#####      6.2 提交违约重生申请
```SQL
INSERT INTO renewals (
    Renewal_id, customer_id, customer_name, renewal_reason_id,
    Status, remark, applicant, create_time
) 
SELECT 
    ?,
    Dc. Customer_id,
    Dc. Customer_name,
    ?,
    'PENDING',
    ?,
    ?,
    CURRENT_TIMESTAMP
FROM default_customers dc
WHERE dc. Customer_id = ? AND dc. Is_active = TRUE;
```

####     6.3 查询重生原因列表
```SQL
SELECT 
    Id,
    Reason,
    Enabled
FROM renewal_reasons
WHERE enabled = TRUE
ORDER BY sort_order ASC;
```

#### 6 .4 审核违约重生申请
```SQL
UPDATE renewals
SET status = ?,
    Approver = ?,
    Approve_time = CURRENT_TIMESTAMP,
    Approve_remark = ?
WHERE renewal_id = ?;
```

#####      如果重生审核通过，更新相关记录
##### 将违约客户记录设为无效
```SQL
UPDATE default_customers 
SET is_active = FALSE,
    Update_time = CURRENT_TIMESTAMP
WHERE customer_id = (SELECT customer_id FROM renewals WHERE renewal_id = ?);
```

##### 更新客户状态为正常
```SQL
UPDATE customers 
SET status = 'NORMAL',
    Update_time = CURRENT_TIMESTAMP
WHERE id = (SELECT customer_id FROM renewals WHERE renewal_id = ?);
```

#### 7.1 按行业统计违约情况
```SQL
SELECT 
    c.industry,
    COUNT (dc. Id) as count,
    ROUND (COUNT (dc. Id) * 100.0 / total_count. Total, 2) as percentage,
    'STABLE' as trend  -- 趋势需要通过历史数据计算
FROM default_customers dc
JOIN customers c ON dc. Customer_id = c.id
CROSS JOIN (
    SELECT COUNT (*) as total 
    FROM default_customers 
    WHERE is_active = TRUE 
        AND YEAR (approve_time) = ?
) total_count
WHERE dc. Is_active = TRUE 
    AND YEAR (dc. Approve_time) = ?
GROUP BY c.industry, total_count. Total
ORDER BY count DESC;
```

#### 7.2 按区域统计违约情况
```SQL
SELECT 
    c.region,
    COUNT (dc. Id) as count,
    ROUND (COUNT (dc. Id) * 100.0 / total_count. Total, 2) as percentage,
    'STABLE' as trend  -- 趋势需要通过历史数据计算
FROM default_customers dc
JOIN customers c ON dc. Customer_id = c.id
CROSS JOIN (
    SELECT COUNT (*) as total 
    FROM default_customers 
    WHERE is_active = TRUE 
        AND YEAR (approve_time) = ?
) total_count
WHERE dc. Is_active = TRUE 
    AND YEAR (dc. Approve_time) = ?
GROUP BY c.region, total_count. Total
ORDER BY count DESC;
```

#### 7.3 获取趋势统计数据 - 按行业
```SQL
SELECT 
    YEAR (dc. Approve_time) as year,
    COUNT (dc. Id) as defaultCount,
    (SELECT COUNT (*) FROM renewals r 
     JOIN customers c 2 ON r.customer_id = c 2. Id 
     WHERE c 2. Industry = ? 
        AND r.status = 'APPROVED' 
        AND YEAR (r.approve_time) = YEAR (dc. Approve_time)
    ) as renewalCount
FROM default_customers dc
JOIN customers c ON dc. Customer_id = c.id
WHERE c.industry = ?
    AND dc. Is_active = TRUE
GROUP BY YEAR (dc. Approve_time)
ORDER BY year;
```

#### 7.3 获取趋势统计数据 - 按区域
```SQL
SELECT 
    YEAR (dc. Approve_time) as year,
    COUNT (dc. Id) as defaultCount,
    (SELECT COUNT (*) FROM renewals r 
     JOIN customers c 2 ON r.customer_id = c 2. Id 
     WHERE c 2. Region = ? 
        AND r.status = 'APPROVED' 
        AND YEAR (r.approve_time) = YEAR (dc. Approve_time)
    ) as renewalCount
FROM default_customers dc
JOIN customers c ON dc. Customer_id = c.id
WHERE c.region = ?
    AND dc. Is_active = TRUE
GROUP BY YEAR (dc. Approve_time)
ORDER BY year;
```

#### 8.1 上传附件记录
```SQL
INSERT INTO attachments (
    File_id, file_name, file_url, file_size, file_type,
    Business_type, business_id, upload_time, uploaded_by
) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?);
```


