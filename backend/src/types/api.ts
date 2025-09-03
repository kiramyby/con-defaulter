// API类型定义

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  size: number;
  list: T[];
}

// 违约原因相关
export interface DefaultReasonDto {
  id: number;
  reason: string;
  detail: string;
  enabled: boolean;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export interface CreateDefaultReasonDto {
  reason: string;
  detail: string;
  enabled: boolean;
  sortOrder: number;
}

export interface UpdateDefaultReasonDto {
  reason: string;
  detail: string;
  enabled: boolean;
  sortOrder: number;
}

// 客户相关
export interface CustomerDto {
  id: number;
  customerCode: string;
  customerName: string;
  industry?: string;
  region?: string;
  latestExternalRating?: string;
  status: 'NORMAL' | 'DEFAULT' | 'RENEWAL';
}

// 违约申请相关
export interface DefaultApplicationDto {
  applicationId: string;
  customerId: number;
  customerName: string;
  applicant: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  defaultReasons: number[];
  createTime: string;
  latestExternalRating?: string;
}

export interface CreateDefaultApplicationDto {
  customerName: string;
  latestExternalRating?: string;
  defaultReasons: number[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  remark?: string;
  attachments?: AttachmentDto[];
}

export interface DefaultApplicationDetailDto {
  applicationId: string;
  customerId: number;
  customerName: string;
  latestExternalRating?: string;
  defaultReasons: number[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  remark?: string;
  attachments: AttachmentDto[];
  applicant: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createTime: string;
  approveTime?: string;
  approver?: string;
  approveRemark?: string;
}

export interface ApproveApplicationDto {
  approved: boolean;
  remark?: string;
}

export interface BatchApproveDto {
  applications: Array<{
    applicationId: string;
    approved: boolean;
    remark?: string;
  }>;
}

// 违约客户相关
export interface DefaultCustomerDto {
  customerId: number;
  customerName: string;
  status: 'DEFAULT';
  defaultReasons: number[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  applicant: string;
  applicationTime: string;
  approveTime: string;
  latestExternalRating?: string;
}

// 重生申请相关
export interface RenewalDto {
  renewalId: string;
  customerId: number;
  customerName: string;
  renewalReason: {
    id: number;
    reason: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remark?: string;
  applicant: string;
  createTime: string;
  approver?: string;
  approveTime?: string;
  approveRemark?: string;
  customer?: {
    industry?: string;
    region?: string;
  };
}

export interface CreateRenewalDto {
  customerId: number;
  renewalReason: number;
  remark?: string;
}

export interface RenewalDetailDto {
  renewalId: string;
  customerId: number;
  customerName: string;
  customerInfo: {
    industry?: string;
    region?: string;
    latestExternalRating?: string;
  };
  renewalReason: {
    id: number;
    reason: string;
  };
  originalDefaultReasons: Array<{
    id: number;
    reason: string;
  }>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remark?: string;
  applicant: string;
  createTime: string;
  approver?: string;
  approveTime?: string;
  approveRemark?: string;
}

export interface RenewalReasonDto {
  id: number;
  reason: string;
  enabled: boolean;
}

export interface ApproveRenewalDto {
  approved: boolean;
  remark?: string;
}

export interface BatchApproveRenewalDto {
  renewals: Array<{
    renewalId: string;
    approved: boolean;
    remark?: string;
  }>;
}

export interface BatchApproveRenewalResultDto {
  successCount: number;
  failCount: number;
  details: Array<{
    renewalId: string;
    success: boolean;
    message: string;
  }>;
}

export interface RenewalQueryParams {
  page?: number;
  size?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  customerName?: string;
  applicant?: string;
  startTime?: string;
  endTime?: string;
}

// 统计相关
export interface IndustryStatDto {
  industry: string;
  count: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface RegionStatDto {
  region: string;
  count: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface StatisticsResponseDto {
  year: number;
  type: 'DEFAULT' | 'RENEWAL';
  total: number;
  industries?: IndustryStatDto[];
  regions?: RegionStatDto[];
}

export interface TrendDataDto {
  year: number;
  defaultCount: number;
  renewalCount: number;
}

export interface TrendResponseDto {
  dimension: 'INDUSTRY' | 'REGION';
  target: string;
  trend: TrendDataDto[];
}

// 附件相关
export interface AttachmentDto {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export interface FileUploadResponseDto {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadTime: string;
}

// 查询参数
export interface DefaultReasonQueryParams {
  page?: number;
  size?: number;
  enabled?: boolean;
}

export interface ApplicationQueryParams {
  page?: number;
  size?: number;
  status?: string;
  customerName?: string;
  applicant?: string;
  startTime?: string;
  endTime?: string;
  severity?: string;
}

export interface DefaultCustomerQueryParams {
  page?: number;
  size?: number;
  customerName?: string;
  status?: string;
  severity?: string;
  startTime?: string;
  endTime?: string;
}

export interface StatisticsQueryParams {
  year?: number;
  type?: 'DEFAULT' | 'RENEWAL';
}

export interface TrendQueryParams {
  dimension: 'INDUSTRY' | 'REGION';
  target: string;
  startYear?: number;
  endYear?: number;
}

// 用户管理相关
export interface UserDto {
  id: number;
  username: string;
  realName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'OPERATOR' | 'AUDITOR';
  status: 'ACTIVE' | 'INACTIVE';
  department?: string;
  createTime: string;
  updateTime: string;
  lastLoginTime?: string;
  createdBy: string;
}

export interface UserQueryParams {
  page?: number;
  size?: number;
  role?: 'ADMIN' | 'OPERATOR' | 'AUDITOR';
  status?: 'ACTIVE' | 'INACTIVE';
  keyword?: string;
}

export interface UpdateUserStatusDto {
  status: 'ACTIVE' | 'INACTIVE';
}