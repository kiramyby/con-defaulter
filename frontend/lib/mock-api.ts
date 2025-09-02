// Mock API service for simulating backend responses
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

export interface DefaultReason {
  id: number
  reason: string
  enabled: boolean
  sortOrder: number
  createTime: string
  updateTime: string
}

export interface DefaultApplication {
  applicationId: number
  customerName: string
  latestExternalRating?: string
  defaultReasons: DefaultReason[]
  severity: "HIGH" | "MEDIUM" | "LOW"
  remark?: string
  attachments?: Attachment[]
  applicant: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createTime: string
  approveTime?: string
  approver?: string
  approveRemark?: string
}

export interface Attachment {
  fileName: string
  fileUrl: string
  fileSize: number
}

export interface DefaultCustomer {
  customerId: number
  customerName: string
  status: "DEFAULT" | "NORMAL"
  defaultReasons: string[]
  severity: "HIGH" | "MEDIUM" | "LOW"
  applicant: string
  applicationTime: string
  approveTime: string
  latestExternalRating: string
}

export interface RenewalReason {
  id: number
  reason: string
  enabled: boolean
}

export interface RenewalApplication {
  renewalId: number
  customerId: number
  customerName: string
  renewalReason: RenewalReason
  remark?: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  applicant: string
  createTime: string
  approveTime?: string
  approver?: string
  approveRemark?: string
}

export interface StatisticsData {
  year: number
  type: "DEFAULT" | "RENEWAL"
  total: number
  industries?: IndustryStats[]
  regions?: RegionStats[]
}

export interface IndustryStats {
  industry: string
  count: number
  percentage: number
  trend: "UP" | "DOWN" | "STABLE"
}

export interface RegionStats {
  region: string
  count: number
  percentage: number
  trend: "UP" | "DOWN" | "STABLE"
}

export interface TrendData {
  dimension: "INDUSTRY" | "REGION"
  target?: string
  trend: Array<{
    year: number
    defaultCount: number
    renewalCount: number
  }>
}

// Mock data
const mockDefaultReasons: DefaultReason[] = [
  {
    id: 1,
    reason: "6个月内，交易对手技术性或资金等原因，给当天结算带来头寸缺口2次以上",
    enabled: true,
    sortOrder: 1,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
  {
    id: 2,
    reason: "6个月内因各种原因导致成交后撤单2次以上",
    enabled: true,
    sortOrder: 2,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
  {
    id: 3,
    reason: "未能按照合约规定支付或延期支付利息，本金或其他交付义务（不包括在宽限期内延期支付）",
    enabled: true,
    sortOrder: 3,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
  {
    id: 4,
    reason:
      "关联违约：如果集团（内部联系较紧密的集团）或集团内任一公司发生违约，可视情况作为集团内所有成员违约的触发条件",
    enabled: true,
    sortOrder: 4,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
  {
    id: 5,
    reason: "发生消极债务置换：债务人提供给债权人新的或重组的债务，或新的证券组合、现金或资产低于原有金融义务",
    enabled: false,
    sortOrder: 5,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
  {
    id: 6,
    reason: "申请破产保护，发生法律接管，或者处于类似的破产保护状态",
    enabled: true,
    sortOrder: 6,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
  {
    id: 7,
    reason:
      "在其他金融机构违约（包括不限于：人行征信记录中显示贷款分类状态不良类情况，逾期超过90天等），或外部评级显示为违约级别",
    enabled: true,
    sortOrder: 7,
    createTime: "2022-02-11T10:30:00",
    updateTime: "2022-02-11T10:30:00",
  },
]

const mockRenewalReasons: RenewalReason[] = [
  {
    id: 1,
    reason: "正常结算后解除",
    enabled: true,
  },
  {
    id: 2,
    reason: "在其他金融机构违约解除，或外部评级显示为非违约级别",
    enabled: true,
  },
  {
    id: 3,
    reason: "连续12个月内按时支付本金和利息",
    enabled: true,
  },
  {
    id: 4,
    reason: "计提比例小于设置界限",
    enabled: true,
  },
  {
    id: 5,
    reason: "客户的还款意愿和还款能力明显好转，已偿付各项逾期本金、逾期利息和其他费用",
    enabled: true,
  },
  {
    id: 6,
    reason: "导致违约的关联集团内其他发生违约的客户已经违约重生，解除关联成员的违约设定",
    enabled: true,
  },
]

const mockDefaultApplications: DefaultApplication[] = [
  {
    applicationId: 12345,
    customerName: "华润集团有限公司",
    latestExternalRating: "A+",
    defaultReasons: [mockDefaultReasons[0], mockDefaultReasons[2]],
    severity: "HIGH",
    remark: "客户连续两次出现技术性违约，需要重点关注",
    attachments: [
      {
        fileName: "违约证明文件.pdf",
        fileUrl: "https://files.example.com/proof1.pdf",
        fileSize: 1024000,
      },
    ],
    applicant: "张三",
    status: "PENDING",
    createTime: "2024-01-15T10:30:00",
  },
  {
    applicationId: 12346,
    customerName: "中信建投证券股份有限公司",
    latestExternalRating: "AA-",
    defaultReasons: [mockDefaultReasons[1]],
    severity: "MEDIUM",
    remark: "成交后撤单次数超标",
    applicant: "李四",
    status: "APPROVED",
    createTime: "2024-01-14T14:20:00",
    approveTime: "2024-01-15T09:30:00",
    approver: "王经理",
    approveRemark: "证据充分，同意认定为违约",
  },
  {
    applicationId: 12347,
    customerName: "招商银行股份有限公司",
    latestExternalRating: "AAA",
    defaultReasons: [mockDefaultReasons[3]],
    severity: "LOW",
    remark: "关联公司违约影响",
    applicant: "王五",
    status: "REJECTED",
    createTime: "2024-01-13T09:15:00",
    approveTime: "2024-01-14T16:45:00",
    approver: "李经理",
    approveRemark: "关联影响程度不足以构成违约",
  },
  {
    applicationId: 12348,
    customerName: "平安银行股份有限公司",
    latestExternalRating: "AA",
    defaultReasons: [mockDefaultReasons[0], mockDefaultReasons[1], mockDefaultReasons[2]],
    severity: "HIGH",
    remark: "多项违约行为并存，风险极高",
    applicant: "赵六",
    status: "PENDING",
    createTime: "2024-01-16T11:20:00",
  },
  {
    applicationId: 12349,
    customerName: "兴业银行股份有限公司",
    latestExternalRating: "A",
    defaultReasons: [mockDefaultReasons[6]],
    severity: "HIGH",
    remark: "在其他机构出现违约记录",
    applicant: "孙七",
    status: "APPROVED",
    createTime: "2024-01-12T15:30:00",
    approveTime: "2024-01-13T10:15:00",
    approver: "张经理",
    approveRemark: "外部违约记录确实，同意认定",
  },
]

const mockDefaultCustomers: DefaultCustomer[] = [
  {
    customerId: 1001,
    customerName: "华润集团有限公司",
    status: "DEFAULT",
    defaultReasons: ["技术性违约", "资金违约"],
    severity: "HIGH",
    applicant: "张三",
    applicationTime: "2024-01-15T10:30:00",
    approveTime: "2024-01-16T09:30:00",
    latestExternalRating: "A+",
  },
  {
    customerId: 1002,
    customerName: "中信建投证券股份有限公司",
    status: "DEFAULT",
    defaultReasons: ["成交后撤单"],
    severity: "MEDIUM",
    applicant: "李四",
    applicationTime: "2024-01-14T14:20:00",
    approveTime: "2024-01-15T09:30:00",
    latestExternalRating: "AA-",
  },
  {
    customerId: 1003,
    customerName: "兴业银行股份有限公司",
    status: "DEFAULT",
    defaultReasons: ["外部违约记录"],
    severity: "HIGH",
    applicant: "孙七",
    applicationTime: "2024-01-12T15:30:00",
    approveTime: "2024-01-13T10:15:00",
    latestExternalRating: "A",
  },
  {
    customerId: 1004,
    customerName: "光大银行股份有限公司",
    status: "DEFAULT",
    defaultReasons: ["未按时支付利息"],
    severity: "MEDIUM",
    applicant: "钱八",
    applicationTime: "2024-01-10T11:45:00",
    approveTime: "2024-01-11T14:20:00",
    latestExternalRating: "AA",
  },
  {
    customerId: 1005,
    customerName: "民生银行股份有限公司",
    status: "DEFAULT",
    defaultReasons: ["关联违约"],
    severity: "LOW",
    applicant: "周九",
    applicationTime: "2024-01-08T16:10:00",
    approveTime: "2024-01-09T10:30:00",
    latestExternalRating: "A+",
  },
]

const mockRenewalApplications: RenewalApplication[] = [
  {
    renewalId: 2001,
    customerId: 1001,
    customerName: "华润集团有限公司",
    renewalReason: mockRenewalReasons[0],
    remark: "客户已正常结算6个月，申请重生",
    status: "PENDING",
    applicant: "张三",
    createTime: "2024-01-20T10:30:00",
  },
  {
    renewalId: 2002,
    customerId: 1002,
    customerName: "中信建投证券股份有限公司",
    renewalReason: mockRenewalReasons[2],
    remark: "客户连续12个月按时支付本金和利息",
    status: "APPROVED",
    applicant: "李四",
    createTime: "2024-01-18T14:20:00",
    approveTime: "2024-01-19T09:15:00",
    approver: "王经理",
    approveRemark: "客户表现良好，同意重生",
  },
  {
    renewalId: 2003,
    customerId: 1003,
    customerName: "兴业银行股份有限公司",
    renewalReason: mockRenewalReasons[1],
    remark: "外部评级已恢复至非违约级别",
    status: "REJECTED",
    applicant: "孙七",
    createTime: "2024-01-16T11:20:00",
    approveTime: "2024-01-17T15:45:00",
    approver: "李经理",
    approveRemark: "外部评级恢复时间不足，暂不同意重生",
  },
]

const mockIndustryStats: IndustryStats[] = [
  { industry: "金融业", count: 30, percentage: 30.0, trend: "UP" },
  { industry: "制造业", count: 25, percentage: 25.0, trend: "DOWN" },
  { industry: "房地产业", count: 20, percentage: 20.0, trend: "STABLE" },
  { industry: "信息技术业", count: 15, percentage: 15.0, trend: "UP" },
  { industry: "能源业", count: 10, percentage: 10.0, trend: "DOWN" },
]

const mockRegionStats: RegionStats[] = [
  { region: "华东地区", count: 40, percentage: 40.0, trend: "STABLE" },
  { region: "华北地区", count: 30, percentage: 30.0, trend: "UP" },
  { region: "华南地区", count: 20, percentage: 20.0, trend: "DOWN" },
  { region: "西南地区", count: 10, percentage: 10.0, trend: "STABLE" },
]

export interface User {
  id: number
  username: string
  password?: string
  role: "employee" | "admin"
  name: string
}

// 添加模拟用户数据
const mockUsers: User[] = [
  {
    id: 1,
    username: "employee1",
    password: "123456",
    role: "employee",
    name: "普通员工"
  },
  {
    id: 2,
    username: "admin1",
    password: "admin123",
    role: "admin",
    name: "系统管理员"
  }
]

// 添加登录API
// const mockApi = {
//   login: async (credentials: {
//     username: string
//     password: string
//     userType: "employee" | "admin"
//   }): Promise<ApiResponse<User>> => {
//     await new Promise(resolve => setTimeout(resolve, 600))

//     const user = mockUsers.find(
//       u => u.username === credentials.username && 
//            u.password === credentials.password && 
//            u.role === credentials.userType
//     )

//     if (!user) {
//       return createApiResponse(null, 401, "用户名或密码错误")
//     }

//     // 返回不包含密码的用户信息
//     const { password, ...userWithoutPassword } = user
//     return createApiResponse(userWithoutPassword)
//   }
// }

// Utility function to create mock API response
function createApiResponse<T>(data: T, message = "success"): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
    timestamp: new Date().toISOString(),
  }
}

// Mock API functions
export const mockApi = {
  login: async (credentials: {
    username: string
    password: string
    userType: "employee" | "admin"
  }): Promise<ApiResponse<User | null>> => {
    await new Promise(resolve => setTimeout(resolve, 600))

    const user = mockUsers.find(
      u => u.username === credentials.username && 
           u.password === credentials.password && 
           u.role === credentials.userType
    )

    if (!user) {
      return createApiResponse(null, "用户名或密码错误")
    }

    // 返回不包含密码的用户信息
    const { password, ...userWithoutPassword } = user
    return createApiResponse(userWithoutPassword)
  },
  
  // Default Reasons API
  getDefaultReasons: async (params?: { page?: number; size?: number; enabled?: boolean }) => {
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay

    const { page = 1, size = 10, enabled } = params || {}
    let filteredReasons = [...mockDefaultReasons]

    if (enabled !== undefined) {
      filteredReasons = mockDefaultReasons.filter((r) => r.enabled === enabled)
    }

    // Sort by sortOrder
    filteredReasons.sort((a, b) => a.sortOrder - b.sortOrder)

    const start = (page - 1) * size
    const end = start + size
    const paginatedReasons = filteredReasons.slice(start, end)

    return createApiResponse({
      total: filteredReasons.length,
      page,
      size,
      list: paginatedReasons,
    })
  },

  createDefaultReason: async (reason: Omit<DefaultReason, "id" | "createTime" | "updateTime">) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newReason: DefaultReason = {
      ...reason,
      id: Math.max(...mockDefaultReasons.map((r) => r.id)) + 1,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    }

    mockDefaultReasons.push(newReason)
    return createApiResponse(newReason, "新增成功")
  },

  updateDefaultReason: async (id: number, updates: Partial<DefaultReason>) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const reasonIndex = mockDefaultReasons.findIndex((r) => r.id === id)
    if (reasonIndex === -1) {
      throw new Error("违约原因不存在")
    }

    mockDefaultReasons[reasonIndex] = {
      ...mockDefaultReasons[reasonIndex],
      ...updates,
      updateTime: new Date().toISOString(),
    }

    return createApiResponse(null, "更新成功")
  },

  deleteDefaultReason: async (id: number) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const reasonIndex = mockDefaultReasons.findIndex((r) => r.id === id)
    if (reasonIndex === -1) {
      throw new Error("违约原因不存在")
    }

    mockDefaultReasons.splice(reasonIndex, 1)
    return createApiResponse(null, "删除成功")
  },

  // Default Applications API
  getDefaultApplications: async (params?: {
    page?: number
    size?: number
    customerName?: string
    status?: string
    startTime?: string
    endTime?: string
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const { page = 1, size = 10, customerName, status, startTime, endTime } = params || {}
    let filteredApplications = [...mockDefaultApplications]

    // Filter by customer name
    if (customerName) {
      filteredApplications = filteredApplications.filter((app) =>
        app.customerName.toLowerCase().includes(customerName.toLowerCase()),
      )
    }

    // Filter by status
    if (status) {
      filteredApplications = filteredApplications.filter((app) => app.status === status)
    }

    // Filter by date range
    if (startTime) {
      filteredApplications = filteredApplications.filter((app) => new Date(app.createTime) >= new Date(startTime))
    }
    if (endTime) {
      filteredApplications = filteredApplications.filter((app) => new Date(app.createTime) <= new Date(endTime))
    }

    // Sort by create time (newest first)
    filteredApplications.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())

    const start = (page - 1) * size
    const end = start + size
    const paginatedApplications = filteredApplications.slice(start, end)

    return createApiResponse({
      total: filteredApplications.length,
      page,
      size,
      list: paginatedApplications,
    })
  },

  getDefaultApplicationDetail: async (applicationId: number) => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const application = mockDefaultApplications.find((app) => app.applicationId === applicationId)
    if (!application) {
      throw new Error("申请不存在")
    }

    return createApiResponse(application)
  },

  createDefaultApplication: async (
    applicationData: Omit<DefaultApplication, "applicationId" | "createTime" | "status">,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Check if customer already has pending application
    const existingPending = mockDefaultApplications.find(
      (app) => app.customerName === applicationData.customerName && app.status === "PENDING",
    )
    if (existingPending) {
      throw new Error("该客户已有待审核的申请")
    }

    const newApplication: DefaultApplication = {
      ...applicationData,
      applicationId: Math.max(...mockDefaultApplications.map((app) => app.applicationId)) + 1,
      status: "PENDING",
      createTime: new Date().toISOString(),
    }

    mockDefaultApplications.unshift(newApplication)
    return createApiResponse(
      {
        applicationId: newApplication.applicationId,
        customerName: newApplication.customerName,
        status: newApplication.status,
        createTime: newApplication.createTime,
      },
      "申请提交成功",
    )
  },

  approveDefaultApplication: async (applicationId: number, approvalData: { approved: boolean; remark?: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const applicationIndex = mockDefaultApplications.findIndex((app) => app.applicationId === applicationId)
    if (applicationIndex === -1) {
      throw new Error("申请不存在")
    }

    const application = mockDefaultApplications[applicationIndex]
    if (application.status !== "PENDING") {
      throw new Error("申请已被处理")
    }

    mockDefaultApplications[applicationIndex] = {
      ...application,
      status: approvalData.approved ? "APPROVED" : "REJECTED",
      approveTime: new Date().toISOString(),
      approver: "当前用户", // In real app, this would be from auth context
      approveRemark: approvalData.remark,
    }

    return createApiResponse(
      {
        applicationId,
        status: mockDefaultApplications[applicationIndex].status,
        approver: mockDefaultApplications[applicationIndex].approver,
        approveTime: mockDefaultApplications[applicationIndex].approveTime,
      },
      "审核完成",
    )
  },

  batchApproveDefaultApplications: async (
    applications: Array<{ applicationId: number; approved: boolean; remark?: string }>,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const results = []
    let successCount = 0
    let failCount = 0

    for (const app of applications) {
      try {
        const applicationIndex = mockDefaultApplications.findIndex((a) => a.applicationId === app.applicationId)
        if (applicationIndex === -1) {
          results.push({
            applicationId: app.applicationId,
            success: false,
            message: "申请不存在",
          })
          failCount++
          continue
        }

        const application = mockDefaultApplications[applicationIndex]
        if (application.status !== "PENDING") {
          results.push({
            applicationId: app.applicationId,
            success: false,
            message: "申请已被处理",
          })
          failCount++
          continue
        }

        mockDefaultApplications[applicationIndex] = {
          ...application,
          status: app.approved ? "APPROVED" : "REJECTED",
          approveTime: new Date().toISOString(),
          approver: "当前用户",
          approveRemark: app.remark,
        }

        results.push({
          applicationId: app.applicationId,
          success: true,
          message: "审核成功",
        })
        successCount++
      } catch (error) {
        results.push({
          applicationId: app.applicationId,
          success: false,
          message: "审核失败",
        })
        failCount++
      }
    }

    return createApiResponse(
      {
        successCount,
        failCount,
        details: results,
      },
      "批量审核完成",
    )
  },

  // File upload simulation
  uploadFile: async (file: File) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simulate file upload
    const fileId = `f${Date.now()}`
    const fileUrl = `https://files.example.com/${fileId}.${file.name.split(".").pop()}`

    return createApiResponse(
      {
        fileId,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        uploadTime: new Date().toISOString(),
      },
      "上传成功",
    )
  },

  // Renewal Reasons API
  getRenewalReasons: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return createApiResponse(mockRenewalReasons)
  },

  // Renewable Customers API
  getRenewableCustomers: async (params?: { page?: number; size?: number; customerName?: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { page = 1, size = 10, customerName } = params || {}
    let filteredCustomers = mockDefaultCustomers.filter((customer) => customer.status === "DEFAULT")

    // Filter by customer name
    if (customerName) {
      filteredCustomers = filteredCustomers.filter((customer) =>
        customer.customerName.toLowerCase().includes(customerName.toLowerCase()),
      )
    }

    // Sort by application time (newest first)
    filteredCustomers.sort((a, b) => new Date(b.applicationTime).getTime() - new Date(a.applicationTime).getTime())

    const start = (page - 1) * size
    const end = start + size
    const paginatedCustomers = filteredCustomers.slice(start, end)

    return createApiResponse({
      total: filteredCustomers.length,
      page,
      size,
      list: paginatedCustomers,
    })
  },

  // Renewal Applications API
  getRenewalApplications: async (params?: {
    page?: number
    size?: number
    customerName?: string
    status?: string
    startTime?: string
    endTime?: string
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const { page = 1, size = 10, customerName, status, startTime, endTime } = params || {}
    let filteredApplications = [...mockRenewalApplications]

    // Filter by customer name
    if (customerName) {
      filteredApplications = filteredApplications.filter((app) =>
        app.customerName.toLowerCase().includes(customerName.toLowerCase()),
      )
    }

    // Filter by status
    if (status && status !== "all") {
      filteredApplications = filteredApplications.filter((app) => app.status === status)
    }

    // Filter by date range
    if (startTime) {
      filteredApplications = filteredApplications.filter((app) => new Date(app.createTime) >= new Date(startTime))
    }
    if (endTime) {
      filteredApplications = filteredApplications.filter((app) => new Date(app.createTime) <= new Date(endTime))
    }

    // Sort by create time (newest first)
    filteredApplications.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())

    const start = (page - 1) * size
    const end = start + size
    const paginatedApplications = filteredApplications.slice(start, end)

    return createApiResponse({
      total: filteredApplications.length,
      page,
      size,
      list: paginatedApplications,
    })
  },

  createRenewalApplication: async (
    applicationData: Omit<RenewalApplication, "renewalId" | "createTime" | "status">,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 700))

    // Check if customer already has pending renewal application
    const existingPending = mockRenewalApplications.find(
      (app) => app.customerId === applicationData.customerId && app.status === "PENDING",
    )
    if (existingPending) {
      throw new Error("该客户已有待审核的重生申请")
    }

    // Check if customer is in default status
    const customer = mockDefaultCustomers.find((c) => c.customerId === applicationData.customerId)
    if (!customer || customer.status !== "DEFAULT") {
      throw new Error("客户非违约状态，无法申请重生")
    }

    const newApplication: RenewalApplication = {
      ...applicationData,
      renewalId: Math.max(...mockRenewalApplications.map((app) => app.renewalId)) + 1,
      status: "PENDING",
      createTime: new Date().toISOString(),
    }

    mockRenewalApplications.unshift(newApplication)
    return createApiResponse(
      {
        renewalId: newApplication.renewalId,
        customerId: newApplication.customerId,
        customerName: newApplication.customerName,
        status: newApplication.status,
        createTime: newApplication.createTime,
      },
      "重生申请提交成功",
    )
  },

  approveRenewalApplication: async (renewalId: number, approvalData: { approved: boolean; remark?: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const applicationIndex = mockRenewalApplications.findIndex((app) => app.renewalId === renewalId)
    if (applicationIndex === -1) {
      throw new Error("重生申请不存在")
    }

    const application = mockRenewalApplications[applicationIndex]
    if (application.status !== "PENDING") {
      throw new Error("申请已被处理")
    }

    mockRenewalApplications[applicationIndex] = {
      ...application,
      status: approvalData.approved ? "APPROVED" : "REJECTED",
      approveTime: new Date().toISOString(),
      approver: "当前用户", // In real app, this would be from auth context
      approveRemark: approvalData.remark,
    }

    // If approved, update customer status to NORMAL
    if (approvalData.approved) {
      const customerIndex = mockDefaultCustomers.findIndex((c) => c.customerId === application.customerId)
      if (customerIndex !== -1) {
        mockDefaultCustomers[customerIndex].status = "NORMAL"
      }
    }

    return createApiResponse(
      {
        renewalId,
        status: mockRenewalApplications[applicationIndex].status,
        approver: mockRenewalApplications[applicationIndex].approver,
        approveTime: mockRenewalApplications[applicationIndex].approveTime,
      },
      "重生审核完成",
    )
  },

  batchApproveRenewalApplications: async (
    applications: Array<{ renewalId: number; approved: boolean; remark?: string }>,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const results = []
    let successCount = 0
    let failCount = 0

    for (const app of applications) {
      try {
        const applicationIndex = mockRenewalApplications.findIndex((a) => a.renewalId === app.renewalId)
        if (applicationIndex === -1) {
          results.push({
            renewalId: app.renewalId,
            success: false,
            message: "申请不存在",
          })
          failCount++
          continue
        }

        const application = mockRenewalApplications[applicationIndex]
        if (application.status !== "PENDING") {
          results.push({
            renewalId: app.renewalId,
            success: false,
            message: "申请已被处理",
          })
          failCount++
          continue
        }

        mockRenewalApplications[applicationIndex] = {
          ...application,
          status: app.approved ? "APPROVED" : "REJECTED",
          approveTime: new Date().toISOString(),
          approver: "当前用户",
          approveRemark: app.remark,
        }

        // If approved, update customer status to NORMAL
        if (app.approved) {
          const customerIndex = mockDefaultCustomers.findIndex((c) => c.customerId === application.customerId)
          if (customerIndex !== -1) {
            mockDefaultCustomers[customerIndex].status = "NORMAL"
          }
        }

        results.push({
          renewalId: app.renewalId,
          success: true,
          message: "审核成功",
        })
        successCount++
      } catch (error) {
        results.push({
          renewalId: app.renewalId,
          success: false,
          message: "审核失败",
        })
        failCount++
      }
    }

    return createApiResponse(
      {
        successCount,
        failCount,
        details: results,
      },
      "批量审核完成",
    )
  },

  // Statistics API
  getStatisticsByIndustry: async (params: { year: number; type?: "DEFAULT" | "RENEWAL" }) => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const { year, type = "DEFAULT" } = params
    const total = mockIndustryStats.reduce((sum, item) => sum + item.count, 0)

    return createApiResponse({
      year,
      type,
      total,
      industries: mockIndustryStats,
    })
  },

  getStatisticsByRegion: async (params: { year: number; type?: "DEFAULT" | "RENEWAL" }) => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const { year, type = "DEFAULT" } = params
    const total = mockRegionStats.reduce((sum, item) => sum + item.count, 0)

    return createApiResponse({
      year,
      type,
      total,
      regions: mockRegionStats,
    })
  },

  getTrendStatistics: async (params: {
    startYear: number
    endYear: number
    dimension: "INDUSTRY" | "REGION"
    target?: string
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const { startYear, endYear, dimension, target } = params
    const years = []
    for (let year = startYear; year <= endYear; year++) {
      years.push(year)
    }

    // Generate mock trend data
    const trend = years.map((year, index) => ({
      year,
      defaultCount: 25 + Math.floor(Math.random() * 10) + index * 2,
      renewalCount: 5 + Math.floor(Math.random() * 5) + index,
    }))

    return createApiResponse({
      dimension,
      target: target || (dimension === "INDUSTRY" ? "金融业" : "华东地区"),
      trend,
    })
  },
}