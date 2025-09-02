-- 修复后的RLS配置 - 适配BigInt主键
-- 此版本解决UUID与BigInt类型匹配问题

-- 首先从用户表中获取当前登录用户的username
-- 而不是直接匹配用户ID

-- 1. 启用所有表的RLS (保持不变)
ALTER TABLE public.default_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_default_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_customer_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;

-- 2. 创建辅助函数获取当前用户的username
CREATE OR REPLACE FUNCTION public.get_current_username()
RETURNS text AS $$
BEGIN
    -- 从JWT token中获取username字段
    RETURN current_setting('jwt.claims.username', true)::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建函数检查当前用户是否为管理员
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE username = public.get_current_username()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建辅助函数检查当前用户是否为操作员或审核员
CREATE OR REPLACE FUNCTION public.has_operator_role()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE username = public.get_current_username()
        AND role IN ('ADMIN', 'AUDITOR', 'OPERATOR')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建RLS策略 (使用辅助函数避免类型不匹配)

-- 对于配置表 - 所有用户可读取
CREATE POLICY "配置表读取策略" ON public.default_reasons FOR SELECT USING (true);
CREATE POLICY "续期原因读取策略" ON public.renewal_reasons FOR SELECT USING (true);

-- 对于客户表
CREATE POLICY "客户读取策略" ON public.customers FOR SELECT USING (true);
CREATE POLICY "客户写入策略" ON public.customers FOR ALL 
    USING (public.is_admin());

-- 对于申请表 (使用username对比避免类型问题)
CREATE POLICY "申请表读取策略" ON public.default_applications FOR SELECT 
    USING (
        applicant = public.get_current_username() OR
        public.has_operator_role()
    );

CREATE POLICY "申请表创建策略" ON public.default_applications FOR INSERT 
    WITH CHECK (applicant = public.get_current_username());

CREATE POLICY "申请表更新策略" ON public.default_applications FOR UPDATE 
    USING (
        approver = public.get_current_username() OR
        public.has_operator_role()
    );

-- 对于附件表
CREATE POLICY "附件读取策略" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "附件创建策略" ON public.attachments FOR INSERT 
    WITH CHECK (uploaded_by = public.get_current_username());
CREATE POLICY "附件删除策略" ON public.attachments FOR DELETE 
    USING (
        uploaded_by = public.get_current_username() OR
        public.is_admin()
    );

-- 对于默认客户表
CREATE POLICY "默认客户读取策略" ON public.default_customers FOR SELECT 
    USING (
        applicant = public.get_current_username() OR
        approver = public.get_current_username() OR
        public.has_operator_role()
    );

CREATE POLICY "默认客户创建策略" ON public.default_customers FOR INSERT 
    WITH CHECK (applicant = public.get_current_username());

CREATE POLICY "默认客户更新策略" ON public.default_customers FOR UPDATE 
    USING (public.has_operator_role());

-- 对于续期表
CREATE POLICY "续期读取策略" ON public.renewals FOR SELECT 
    USING (
        applicant = public.get_current_username() OR
        public.has_operator_role()
    );

CREATE POLICY "续期创建策略" ON public.renewals FOR INSERT 
    WITH CHECK (applicant = public.get_current_username());

CREATE POLICY "续期更新策略" ON public.renewals FOR UPDATE 
    USING (
        approver = public.get_current_username() OR
        public.has_operator_role()
    );

-- 对于用户表 (通过username匹配)
CREATE POLICY "用户读取策略" ON public.users FOR SELECT 
    USING (
        username = public.get_current_username() OR
        public.is_admin()
    );

CREATE POLICY "用户更新策略" ON public.users FOR UPDATE 
    USING (public.is_admin());

CREATE POLICY "用户创建策略" ON public.users FOR INSERT 
    WITH CHECK (public.is_admin());

-- 对于操作日志表
CREATE POLICY "操作日志读取策略" ON public.operation_logs FOR SELECT 
    USING (
        username = public.get_current_username() OR
        public.has_operator_role()
    );

CREATE POLICY "操作日志写入策略" ON public.operation_logs FOR INSERT 
    WITH CHECK (username = public.get_current_username());

-- 6. 对于关联表，使用简单策略
CREATE POLICY "关联表读取策略" ON public.application_default_reasons FOR SELECT USING (true);
CREATE POLICY "关联表创建策略" ON public.application_default_reasons FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.default_applications da
            WHERE da.id = application_default_reasons.application_id
            AND da.applicant = public.get_current_username()
        )
    );

CREATE POLICY "关联表删除策略" ON public.application_default_reasons FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.default_applications da
            WHERE da.id = application_default_reasons.application_id
            AND da.applicant = public.get_current_username()
        )
    );

CREATE POLICY "默认客户关联读取策略" ON public.default_customer_reasons FOR SELECT USING (true);
CREATE POLICY "默认客户关联创建策略" ON public.default_customer_reasons FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.default_customers dc
            WHERE dc.id = default_customer_reasons.default_customer_id
            AND dc.applicant = public.get_current_username()
        )
    );

CREATE POLICY "默认客户关联删除策略" ON public.default_customer_reasons FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.default_customers dc
            WHERE dc.id = default_customer_reasons.default_customer_id
            AND dc.applicant = public.get_current_username()
        )
    );