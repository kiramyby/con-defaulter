class ApiService {
  private baseURL = "http://localhost:3001/api/v1"

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

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Network error" }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json().then((data) => data.data)
  }

  async getDefaultReasons(
    params: {
      page?: number
      size?: number
      reasonName?: string
      isEnabled?: boolean
    } = {},
  ) {
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

  async getDefaultApplications(
    params: {
      page?: number
      size?: number
      status?: "PENDING" | "APPROVED" | "REJECTED"
      customerName?: string
      applicant?: string
      severity?: "HIGH" | "MEDIUM" | "LOW"
      startTime?: string
      endTime?: string
    } = {},
  ) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })

    return this.request(`/default-applications?${searchParams}`)
  }

  async createDefaultApplication(data: {
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
  }) {
    return this.request("/default-applications", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getDefaultApplication(applicationId: string) {
    return this.request(`/default-applications/${applicationId}`)
  }

  async approveDefaultApplication(
    applicationId: string,
    data: {
      approved: boolean
      remark?: string
    },
  ) {
    return this.request(`/default-applications/${applicationId}/approve`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async batchApproveDefaultApplications(
    applications: Array<{
      applicationId: string
      approved: boolean
      remark?: string
    }>,
  ) {
    return this.request("/default-applications/batch-approve", {
      method: "POST",
      body: JSON.stringify({ applications }),
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
}

export const apiService = new ApiService()
