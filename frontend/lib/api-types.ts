// 基础API响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页响应类型
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  size: number
}

// 用户相关类型
export interface User {
  id: string
  email: string
  dbId: number
  username: string
  realName: string
  phone: string
  role: "ADMIN" | "OPERATOR" | "AUDITOR" | "USER"
  status: "ACTIVE" | "INACTIVE"
  department: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: User
}

// 违约原因类型
export interface DefaultReason {
  id: number
  reason: string
  detail: string
  enabled: boolean
  sortOrder: number
  createTime: string
  updateTime: string
}

export type DefaultReasonsResponse = PaginatedResponse<DefaultReason>

// 违约申请类型
export interface DefaultApplication {
  applicationId: string
  customerId: number
  customerName: string
  latestExternalRating?: string
  defaultReasons: Array<{
    id: number
    reason: string
  }>
  severity: "HIGH" | "MEDIUM" | "LOW"
  remark?: string
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileSize: number
  }>
  applicant: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createTime: string
  approveTime?: string
  approver?: string
  approveRemark?: string
}

export type DefaultApplicationsResponse = PaginatedResponse<DefaultApplication>

// 违约客户类型
export interface DefaultCustomer {
  customerId: number
  customerName: string
  industry: string
  region: string
  latestExternalRating?: string
  defaultDate: string
  defaultReasons: Array<{
    id: number
    reason: string
  }>
  severity: "HIGH" | "MEDIUM" | "LOW"
  applicant: string
  approver: string
  approveTime: string
}

export type DefaultCustomersResponse = PaginatedResponse<DefaultCustomer>

// 重生原因类型
export interface RenewalReason {
  id: number
  reason: string
  detail: string
  enabled: boolean
  sortOrder: number
}

// 重生申请类型
export interface RenewalApplication {
  renewalId: string
  customerId: number
  customerName: string
  customerInfo: {
    industry: string
    region: string
    latestExternalRating?: string
  }
  renewalReason: {
    id: number
    reason: string
  }
  originalDefaultReasons: Array<{
    id: number
    reason: string
  }>
  status: "PENDING" | "APPROVED" | "REJECTED"
  remark?: string
  applicant: string
  createTime: string
  approver?: string
  approveTime?: string
  approveRemark?: string
}

export type RenewalApplicationsResponse = PaginatedResponse<RenewalApplication>

// 统计分析类型
export interface IndustryStatistics {
  industry: string
  count: number
  percentage: number
  trend: string
}

export interface RegionStatistics {
  region: string
  count: number
  percentage: number
  trend: string
}

export interface StatisticsData {
  year: number
  type: "DEFAULT" | "RENEWAL"
  total: number
  industries?: IndustryStatistics[]
  regions?: RegionStatistics[]
}

export interface TrendDataPoint {
  year: number
  defaultCount: number
  renewalCount: number
}

export interface TrendData {
  dimension: "INDUSTRY" | "REGION"
  target: string
  trend: TrendDataPoint[]
}

// API参数类型
export interface GetDefaultReasonsParams {
  page?: number
  size?: number
  reasonName?: string
  isEnabled?: boolean
}

export interface GetDefaultApplicationsParams {
  page?: number
  size?: number
  status?: "PENDING" | "APPROVED" | "REJECTED"
  customerName?: string
  applicant?: string
  severity?: "HIGH" | "MEDIUM" | "LOW"
  startTime?: string
  endTime?: string
}

export interface CreateDefaultApplicationData {
  customerName: string
  latestExternalRating?: string
  defaultReasons: number[]
  severity: "HIGH" | "MEDIUM" | "LOW"
  remark?: string
  attachments?: Array<{
    fileName: string
    fileUrl: string
    fileSize: number
  }>
}

export interface ApprovalData {
  approved: boolean
  remark?: string
}

export interface BatchApprovalData {
  applications: Array<{
    applicationId: string
    approved: boolean
    remark?: string
  }>
}

// 文件上传类型
export interface FileUploadResponse {
  fileName: string
  fileUrl: string
  fileSize: number
}

// 用户管理类型
export interface CreateUserData {
  username: string
  realName: string
  email: string
  phone?: string
  department?: string
  role: "ADMIN" | "OPERATOR" | "AUDITOR" | "USER"
  password: string
}

export interface UpdateUserData {
  username?: string
  realName?: string
  email?: string
  phone?: string
  department?: string
  role?: "ADMIN" | "OPERATOR" | "AUDITOR"
  status?: "ACTIVE" | "INACTIVE"
}

export type UsersResponse = PaginatedResponse<User>

export interface GetUsersParams {
  page?: number
  size?: number
  role?: "ADMIN" | "OPERATOR" | "AUDITOR"
  status?: "ACTIVE" | "INACTIVE"
  keyword?: string
}