import type {
  ApiResponse,
  DefaultReasonsResponse,
  DefaultApplicationsResponse,
  DefaultCustomersResponse,
  RenewalApplicationsResponse,
  GetDefaultReasonsParams,
  GetDefaultApplicationsParams,
  CreateDefaultApplicationData,
  ApprovalData,
  BatchApprovalData,
  FileUploadResponse,
  StatisticsData,
  TrendData,
  DefaultApplication,
  CreateUserData,
  UpdateUserData,
  UsersResponse,
  GetUsersParams,
  User
} from './api-types'

class ApiService {
  private baseURL = "https://server.kiracoon.top/api/v1"

  private getAuthHeaders() {
    const token = localStorage.getItem("auth_token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      // 处理不同的HTTP状态码
      if (response.status === 401) {
        // 未授权 - 清除本地token并跳转登录
        localStorage.removeItem("auth_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("auth_user")
        window.location.href = "/login"
        throw new Error("登录已过期，请重新登录")
      }
      
      if (response.status === 403) {
        // 权限不足
        throw new Error("权限不足，无法执行此操作")
      }
      
      if (response.status === 404) {
        // 资源不存在
        throw new Error("请求的资源不存在")
      }
      
      if (response.status === 422) {
        // 数据验证失败
        const error = await response.json().catch(() => ({ message: "数据验证失败" }))
        throw new Error(error.message || "请求数据格式不正确")
      }
      
      if (response.status === 429) {
        // 请求过于频繁
        throw new Error("请求过于频繁，请稍后再试")
      }
      
      if (response.status >= 500) {
        // 服务器错误
        throw new Error("服务器内部错误，请稍后再试")
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `请求失败 (${response.status})` }))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const responseData = await response.json()
      
      // 检查业务状态码
      if (responseData.code && responseData.code !== 200) {
        throw new Error(responseData.message || "请求失败")
      }
      
      return responseData.data || responseData
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("网络连接失败，请检查网络设置")
      }
      throw error
    }
  }

  async getDefaultReasons(params: GetDefaultReasonsParams = {}): Promise<DefaultReasonsResponse> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.append("page", params.page.toString())
    if (params.size) searchParams.append("size", params.size.toString())
    if (params.reasonName) searchParams.append("reasonName", params.reasonName)
    if (params.isEnabled !== undefined) searchParams.append("isEnabled", params.isEnabled.toString())

    return this.request(`/default-reasons?${searchParams}`)
  }

  async getEnabledDefaultReasons() {
    return this.request("/default-reasons/enabled")
  }

  async createDefaultReason(data: {
    reason: string
    detail: string
    enabled?: boolean
    sortOrder?: number
  }) {
    return this.request("/default-reasons", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getDefaultReason(id: number) {
    return this.request(`/default-reasons/${id}`)
  }

  async getDefaultApplications(params: GetDefaultApplicationsParams = {}): Promise<DefaultApplicationsResponse> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/default-applications?${searchParams}`)
  }

  async createDefaultApplication(data: CreateDefaultApplicationData): Promise<DefaultApplication> {
    return this.request("/default-applications", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getDefaultApplication(applicationId: string): Promise<DefaultApplication> {
    return this.request(`/default-applications/${applicationId}`)
  }

  async approveDefaultApplication(applicationId: string, data: ApprovalData): Promise<void> {
    return this.request(`/default-applications/${applicationId}/approve`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async batchApproveDefaultApplications(data: BatchApprovalData): Promise<void> {
    return this.request("/default-applications/batch-approve", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getDefaultCustomers(
    params: {
      page?: number
      size?: number
      customerName?: string
      severity?: "HIGH" | "MEDIUM" | "LOW"
      startTime?: string
      endTime?: string
    } = {},
  ) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/default-customers?${searchParams}`)
  }

  async exportDefaultCustomers(params: any) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    const response = await fetch(`${this.baseURL}/default-customers/export?${searchParams}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Export failed")
    }

    return response.blob()
  }

  async getDefaultCustomer(customerId: number) {
    return this.request(`/default-customers/${customerId}`)
  }

  async getRenewableCustomers(
    params: {
      page?: number
      size?: number
      customerName?: string
    } = {},
  ) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/default-customers/renewable?${searchParams}`)
  }

  async getRenewalReasons() {
    return this.request("/renewal-reasons")
  }

  async createRenewalApplication(data: {
    customerId: number
    renewalReason: number
    remark?: string
  }) {
    return this.request("/renewals", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getRenewalApplications(
    params: {
      page?: number
      size?: number
      status?: "PENDING" | "APPROVED" | "REJECTED"
      customerName?: string
      applicant?: string
      startTime?: string
      endTime?: string
    } = {},
  ) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/renewals?${searchParams}`)
  }

  async getRenewalApplication(renewalId: string) {
    return this.request(`/renewals/${renewalId}`)
  }

  async approveRenewalApplication(
    renewalId: string,
    data: {
      approved: boolean
      remark?: string
    },
  ) {
    return this.request(`/renewals/${renewalId}/approve`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async batchApproveRenewalApplications(
    renewals: Array<{
      renewalId: string
      approved: boolean
      remark?: string
    }>,
  ) {
    return this.request("/renewals/batch-approve", {
      method: "POST",
      body: JSON.stringify({ renewals }),
    })
  }

  async getStatisticsByIndustry(params: {
    year: number
    type?: "DEFAULT" | "RENEWAL"
  }) {
    const searchParams = new URLSearchParams()
    searchParams.append("year", params.year.toString())
    if (params.type) searchParams.append("type", params.type)

    return this.request(`/statistics/by-industry?${searchParams}`)
  }

  async getStatisticsByRegion(params: {
    year: number
    type?: "DEFAULT" | "RENEWAL"
  }) {
    const searchParams = new URLSearchParams()
    searchParams.append("year", params.year.toString())
    if (params.type) searchParams.append("type", params.type)

    return this.request(`/statistics/by-region?${searchParams}`)
  }

  async getTrendStatistics(params: {
    startYear: number
    endYear: number
    dimension: "INDUSTRY" | "REGION"
    target?: string
  }) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/statistics/trend?${searchParams}`)
  }

  async uploadFile(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    const token = localStorage.getItem("auth_token")
    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error("File upload failed")
    }

    return response.json()
  }

  // 用户管理相关方法
  async getUsers(params: GetUsersParams = {}): Promise<UsersResponse> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/users?${searchParams}`)
  }

  async createUser(data: CreateUserData): Promise<User> {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getUser(userId: number | string): Promise<User> {
    return this.request(`/users/${userId}`)
  }

  async updateUser(userId: number | string, data: UpdateUserData): Promise<User> {
    return this.request(`/users/${userId}`, {
      method: "PUT", 
      body: JSON.stringify(data),
    })
  }

  async deleteUser(userId: number | string): Promise<void> {
    return this.request(`/users/${userId}`, {
      method: "DELETE",
    })
  }

  async resetUserPassword(userId: number | string, newPassword: string): Promise<void> {
    return this.request(`/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    })
  }
}

export const apiService = new ApiService()
