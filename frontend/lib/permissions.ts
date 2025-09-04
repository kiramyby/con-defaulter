type UserRole = "ADMIN" | "OPERATOR" | "AUDITOR" | "USER"

interface User {
  id: string
  email: string
  dbId: number
  username: string
  realName: string
  role: UserRole
  status: "ACTIVE" | "INACTIVE"
  department: string
}

export const PERMISSIONS = {
  // 基础权限
  VIEW_OVERVIEW: ["ADMIN", "AUDITOR", "OPERATOR", "USER"],
  
  // 用户管理 - 仅管理员
  CREATE_USER: ["ADMIN"],
  MANAGE_USERS: ["ADMIN"],
  VIEW_USERS: ["ADMIN"],
  UPDATE_USER: ["ADMIN"],
  DELETE_USER: ["ADMIN"],
  
  // 违约原因管理 - 管理员可以CRUD，操作员只能查看
  CREATE_DEFAULT_REASON: ["ADMIN"],
  UPDATE_DEFAULT_REASON: ["ADMIN"],
  DELETE_DEFAULT_REASON: ["ADMIN"],
  VIEW_DEFAULT_REASONS: ["ADMIN", "OPERATOR"],
  
  // 违约申请管理 - 操作员创建，审核员审核，管理员全权限
  CREATE_DEFAULT_APPLICATION: ["ADMIN", "OPERATOR"],
  VIEW_ALL_APPLICATIONS: ["ADMIN", "AUDITOR"],
  VIEW_OWN_APPLICATIONS: ["OPERATOR"],
  APPROVE_APPLICATIONS: ["ADMIN", "AUDITOR"],
  
  // 违约客户查询 - 分层查看权限
  VIEW_ALL_CUSTOMERS: ["ADMIN", "AUDITOR"],
  VIEW_OWN_CUSTOMERS: ["OPERATOR"],
  
  // 违约重生管理 - 类似申请管理
  CREATE_RENEWAL_APPLICATION: ["ADMIN", "OPERATOR"],
  VIEW_RENEWABLE_CUSTOMERS: ["ADMIN", "OPERATOR"],
  VIEW_ALL_RENEWALS: ["ADMIN", "AUDITOR"],
  VIEW_OWN_RENEWALS: ["OPERATOR"],
  APPROVE_RENEWALS: ["ADMIN", "AUDITOR"],
  
  // 统计分析 - 分层权限
  VIEW_BASIC_STATISTICS: ["ADMIN", "AUDITOR", "OPERATOR", "USER"],
  VIEW_STATISTICS: ["ADMIN", "AUDITOR", "OPERATOR"],
  ADVANCED_ANALYTICS: ["ADMIN", "AUDITOR"],
  
  // 数据导出 - 分层权限
  EXPORT_OWN_DATA: ["ADMIN", "OPERATOR"],
  EXPORT_ALL_DATA: ["ADMIN", "AUDITOR"],
  
  // 系统管理 - 仅管理员
  SYSTEM_CONFIG: ["ADMIN"],
  VIEW_SYSTEM_LOGS: ["ADMIN"],
} as const

export type Permission = keyof typeof PERMISSIONS

export class PermissionManager {
  private user: User | null = null
  
  constructor(user: User | null) {
    this.user = user
  }
  
  hasPermission(permission: Permission): boolean {
    if (!this.user || this.user.status !== "ACTIVE") {
      return false
    }
    
    const allowedRoles = PERMISSIONS[permission] as readonly string[]
    return allowedRoles.includes(this.user.role)
  }
  
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }
  
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission))
  }
  
  canManageUser(targetUser: User): boolean {
    if (!this.user) return false
    
    // ADMIN可以管理所有用户
    if (this.user.role === "ADMIN") return true
    
    // 其他角色不能管理用户
    return false
  }
  
  canViewApplication(application: { applicant: string }): boolean {
    if (!this.user) return false
    
    // ADMIN和AUDITOR可以查看所有申请
    if (this.hasPermission("VIEW_ALL_APPLICATIONS")) return true
    
    // OPERATOR只能查看自己的申请
    if (this.hasPermission("VIEW_OWN_APPLICATIONS")) {
      return application.applicant === this.user.realName
    }
    
    return false
  }
  
  canApproveApplication(): boolean {
    return this.hasPermission("APPROVE_APPLICATIONS")
  }
  
  canViewCustomer(customer: { applicant?: string }): boolean {
    if (!this.user) return false
    
    // ADMIN和AUDITOR可以查看所有客户
    if (this.hasPermission("VIEW_ALL_CUSTOMERS")) return true
    
    // OPERATOR只能查看自己申请的客户
    if (this.hasPermission("VIEW_OWN_CUSTOMERS") && customer.applicant) {
      return customer.applicant === this.user.realName
    }
    
    return false
  }
  
  getFilteredMenuItems() {
    const menuItems = []
    
    // 概览 - 所有登录用户都可以访问
    if (this.hasPermission("VIEW_OVERVIEW")) {
      menuItems.push({
        key: "overview",
        label: "概览",
        icon: "BarChart3",
        visible: true
      })
    }
    
    // 违约原因管理 - 仅ADMIN和OPERATOR可见
    if (this.hasPermission("VIEW_DEFAULT_REASONS")) {
      menuItems.push({
        key: "reasons",
        label: "违约原因",
        icon: "FileText",
        visible: true
      })
    }
    
    // 违约认定申请 - ADMIN, AUDITOR, OPERATOR可见
    if (this.hasAnyPermission(["CREATE_DEFAULT_APPLICATION", "VIEW_ALL_APPLICATIONS", "VIEW_OWN_APPLICATIONS"])) {
      menuItems.push({
        key: "applications",
        label: "认定申请",
        icon: "AlertTriangle",
        visible: true
      })
    }
    
    // 违约重生管理 - ADMIN, AUDITOR, OPERATOR可见
    if (this.hasAnyPermission(["CREATE_RENEWAL_APPLICATION", "VIEW_ALL_RENEWALS", "VIEW_OWN_RENEWALS"])) {
      menuItems.push({
        key: "renewals",
        label: "违约重生",
        icon: "RefreshCw",
        visible: true
      })
    }
    
    // 统计分析 - 根据权限级别显示不同内容
    if (this.hasAnyPermission(["VIEW_BASIC_STATISTICS", "VIEW_STATISTICS", "ADVANCED_ANALYTICS"])) {
      menuItems.push({
        key: "statistics",
        label: "统计分析",
        icon: "TrendingUp",
        visible: true
      })
    }
    
    // 用户管理 - 仅ADMIN可见
    if (this.hasPermission("MANAGE_USERS")) {
      menuItems.push({
        key: "users",
        label: "用户管理",
        icon: "Users",
        visible: true
      })
    }
    
    return menuItems.filter(item => item.visible)
  }
  
  // 新增方法：获取角色描述
  getRoleDescription(): string {
    if (!this.user) return "未登录"
    
    switch (this.user.role) {
      case "ADMIN":
        return "系统管理员"
      case "AUDITOR":
        return "审核员"
      case "OPERATOR":
        return "操作员"
      case "USER":
        return "普通用户"
      default:
        return "未知角色"
    }
  }
  
  // 新增方法：获取角色权限概述
  getRolePermissions(): string[] {
    if (!this.user) return []
    
    switch (this.user.role) {
      case "ADMIN":
        return ["系统管理", "用户管理", "违约原因管理", "申请审核", "数据导出", "高级分析"]
      case "AUDITOR":
        return ["申请审核", "查看所有数据", "高级分析", "数据导出"]
      case "OPERATOR":
        return ["创建申请", "查看自己数据", "违约重生申请", "基础查看"]
      case "USER":
        return ["查看概览", "基础统计查看"]
      default:
        return []
    }
  }
}

export const usePermissions = (user: User | null) => {
  return new PermissionManager(user)
}