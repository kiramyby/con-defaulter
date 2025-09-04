"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, RefreshCw, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/lib/permissions"
import { SecureContent } from "@/components/secure-content"

interface DefaultCustomer {
  customerId: number
  customerName: string
  defaultReasons: string[]
  severity: string
  applicant: string
  applicationTime: string
  approveTime: string
  latestExternalRating: string
}

interface RenewalApplication {
  renewalId: number
  customerId: number
  customerName: string
  renewalReason: {
    id: number
    reason: string
  }
  remark?: string
  applicant: string
  status: string
  createTime: string
  approveTime?: string
  approver?: string
  approveRemark?: string
}

interface RenewalReason {
  id: number
  reason: string
  enabled: boolean
}

interface RenewableCustomersListResponse {
  total: number
  page: number
  size: number
  list: DefaultCustomer[]
}

interface RenewalApplicationsListResponse {
  total: number
  page: number
  size: number
  list: RenewalApplication[]
}

export function RenewalManagement() {
  const { user } = useAuth()
  const permissions = usePermissions(user)
  const [activeTab, setActiveTab] = useState("customers")
  const [renewableCustomers, setRenewableCustomers] = useState<DefaultCustomer[]>([])
  const [renewalApplications, setRenewalApplications] = useState<RenewalApplication[]>([])
  const [renewalReasons, setRenewalReasons] = useState<RenewalReason[]>([])
  const [loading, setLoading] = useState(false)
  const [currentCustomerId, setCurrentCustomerId] = useState(undefined)

  // Pagination for customers
  const [customerPagination, setCustomerPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
  })

  // Pagination for applications
  const [applicationPagination, setApplicationPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
  })

  // Filters
  const [customerFilters, setCustomerFilters] = useState({
    customerName: "",
  })

  const [applicationFilters, setApplicationFilters] = useState({
    customerName: "",
    status: "",
    startTime: "",
    endTime: "",
  })

  // Form and dialog states
  const [selectedCustomer, setSelectedCustomer] = useState<DefaultCustomer | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    renewalReason: 0,
    remark: "",
  })

  // Approval states
  const [selectedApplications, setSelectedApplications] = useState<number[]>([])
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvalData, setApprovalData] = useState({
    renewalId: 0,
    approved: true,
    remark: "",
  })

  const { toast } = useToast()

  // Load renewable customers
  const loadRenewableCustomers = async () => {
    // 检查权限，避免无权限时仍然加载数据
    if (!permissions.hasAnyPermission(["CREATE_RENEWAL_APPLICATION", "VIEW_ALL_RENEWALS", "VIEW_OWN_RENEWALS"])) {
      return
    }
    
    setLoading(true)
    try {
      const response = await apiService.getRenewableCustomers({
        page: customerPagination.page,
        size: customerPagination.size,
        customerName: customerFilters.customerName || undefined,
      })

      setRenewableCustomers(response.list)
      setCustomerPagination((prev) => ({
        ...prev,
        total: response.total,
      }))
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载可重生客户列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load renewal applications
  const loadRenewalApplications = async () => {
    // 检查权限，避免无权限时仍然加载数据
    if (!permissions.hasAnyPermission(["VIEW_ALL_RENEWALS", "VIEW_OWN_RENEWALS"])) {
      return
    }
    
    setLoading(true)
    try {
      const response = await apiService.getRenewalApplications({
        page: applicationPagination.page,
        size: applicationPagination.size,
        customerName: applicationFilters.customerName || undefined,
        status: applicationFilters.status || undefined,
        startTime: applicationFilters.startTime || undefined,
        endTime: applicationFilters.endTime || undefined,
      })

      setRenewalApplications(response.list)
      setApplicationPagination((prev) => ({
        ...prev,
        total: response.total,
      }))
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载重生申请列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load renewal reasons
  const loadRenewalReasons = async () => {
    try {
      const response = await apiService.getRenewalReasons()
      setRenewalReasons(response)
    } catch (error) {
      console.error("Failed to load renewal reasons:", error)
    }
  }

  useEffect(() => {
    if (activeTab === "customers") {
      loadRenewableCustomers()
    } else if (activeTab === "applications") {
      loadRenewalApplications()
    }
  }, [activeTab, customerPagination.page, applicationPagination.page])

  useEffect(() => {
    loadRenewalReasons()
  }, [])

  // Handle customer search
  const handleCustomerSearch = () => {
    setCustomerPagination((prev) => ({ ...prev, page: 1 }))
    loadRenewableCustomers()
  }

  // Handle application search
  const handleApplicationSearch = () => {
    setApplicationPagination((prev) => ({ ...prev, page: 1 }))
    loadRenewalApplications()
  }

  // Handle submit renewal application
  const handleSubmitRenewal = (customer: DefaultCustomer) => {
    setSelectedCustomer(customer)
    setFormData({
      renewalReason: 0,
      remark: "",
    })
    setIsSubmitDialogOpen(true)
  }

  // Submit renewal application
  const submitRenewalApplication = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer || !formData.renewalReason) {
      toast({
        title: "验证失败",
        description: "请选择重生原因",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await apiService.createRenewalApplication({
        customerId: selectedCustomer.customerId,
        renewalReason: formData.renewalReason,
        remark: formData.remark || undefined,
      })

      toast({
        title: "提交成功",
        description: "重生申请已提交",
      })

      setIsSubmitDialogOpen(false)
      setSelectedCustomer(null)
      setFormData({ renewalReason: 0, remark: "" })

      // Refresh data
      if (activeTab === "customers") {
        loadRenewableCustomers()
      } else {
        setActiveTab("applications")
        loadRenewalApplications()
      }
    } catch (error: any) {
      toast({
        title: "提交失败",
        description: error.message || "无法提交重生申请",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle single approval
  const handleSingleApproval = (renewalId: number, approved: boolean) => {
    setApprovalData({
      renewalId,
      approved,
      remark: "",
    })
    setIsApprovalDialogOpen(true)
  }

  // Submit single approval
  const submitSingleApproval = async () => {
    setLoading(true)
    try {
      await apiService.approveRenewalApplication(approvalData.renewalId.toString(), {
        approved: approvalData.approved,
        remark: approvalData.remark,
      })
      toast({
        title: "审核成功",
        description: `重生申请已${approvalData.approved ? "通过" : "拒绝"}`,
      })
      setIsApprovalDialogOpen(false)
      setApprovalData({ renewalId: 0, approved: true, remark: "" })
      loadRenewalApplications()
    } catch (error) {
      console.error("Failed to submit single approval:", error)
      toast({
        title: "审核失败",
        description: "无法完成审核操作",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle batch approval
  const handleBatchApproval = async (approved: boolean) => {
    if (selectedApplications.length === 0) {
      toast({
        title: "请选择申请",
        description: "请先选择要批量审核的申请",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const batchData = selectedApplications.map((id) => ({
        renewalId: id,
        approved,
        remark: approved ? "批量通过" : "批量拒绝",
      }))

      await apiService.batchApproveRenewalApplications(batchData)
      toast({
        title: "批量审核成功",
        description: `已${approved ? "通过" : "拒绝"} ${selectedApplications.length} 个申请`,
      })
      setSelectedApplications([])
      loadRenewalApplications()
    } catch (error) {
      toast({
        title: "批量审核失败",
        description: "无法完成批量审核操作",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            待审核
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            已通过
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            已拒绝
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return <Badge variant="destructive">高</Badge>
      case "MEDIUM":
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            中
          </Badge>
        )
      case "LOW":
        return <Badge variant="secondary">低</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  return (
    <SecureContent permissions={["CREATE_RENEWAL_APPLICATION", "VIEW_ALL_RENEWALS", "VIEW_OWN_RENEWALS"]}>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>违约重生管理</CardTitle>
              <CardDescription>管理违约客户的重生申请和审核流程</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customers">可重生客户</TabsTrigger>
              <TabsTrigger value="applications">重生申请</TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="space-y-4">
              {/* Customer Filters */}
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex-1">
                  <Label htmlFor="customer-search">客户名称</Label>
                  <Input
                    id="customer-search"
                    className="bg-white"
                    placeholder="搜索客户名称..."
                    value={customerFilters.customerName}
                    onChange={(e) => setCustomerFilters((prev) => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleCustomerSearch} className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    搜索
                  </Button>
                  <Button variant="outline" onClick={loadRenewableCustomers} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Customers Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>客户ID</TableHead>
                      <TableHead>客户名称</TableHead>
                      <TableHead>违约原因</TableHead>
                      <TableHead>严重程度</TableHead>
                      <TableHead>认定人</TableHead>
                      <TableHead>认定时间</TableHead>
                      <TableHead>最新外部等级</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            加载中...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : renewableCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无可重生客户
                        </TableCell>
                      </TableRow>
                    ) : (
                      renewableCustomers.map((customer) => (
                        <TableRow key={customer.customerId}>
                          <TableCell className="font-medium">{customer.customerId}</TableCell>
                          <TableCell className="font-medium">{customer.customerName}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm text-muted-foreground truncate">
                                {customer.defaultReasons.join(", ")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getSeverityBadge(customer.severity)}</TableCell>
                          <TableCell>{customer.applicant}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(customer.approveTime).toLocaleString("zh-CN")}
                          </TableCell>
                          <TableCell>{customer.latestExternalRating}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubmitRenewal(customer)}
                              className="flex items-center gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              申请重生
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Customer Pagination */}
              {customerPagination.total > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    共 {customerPagination.total} 条记录，第 {customerPagination.page} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomerPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                      disabled={customerPagination.page <= 1 || loading}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomerPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      disabled={
                        customerPagination.page >= Math.ceil(customerPagination.total / customerPagination.size) ||
                        loading
                      }
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="applications" className="space-y-4">
              {/* Application Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="app-customer-search">客户名称</Label>
                  <Input
                    id="app-customer-search"
                    className="bg-white"
                    placeholder="搜索客户名称..."
                    value={applicationFilters.customerName}
                    onChange={(e) => setApplicationFilters((prev) => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-status-filter">审核状态</Label>
                  <Select
                    value={applicationFilters.status}
                    onValueChange={(value) => setApplicationFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="PENDING">待审核</SelectItem>
                      <SelectItem value="APPROVED">已通过</SelectItem>
                      <SelectItem value="REJECTED">已拒绝</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-start-time">开始时间</Label>
                  <Input
                    id="app-start-time"
                    className="bg-white"
                    type="date"
                    value={applicationFilters.startTime}
                    onChange={(e) => setApplicationFilters((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-end-time">结束时间</Label>
                  <Input
                    id="app-end-time"
                    className="bg-white"
                    type="date"
                    value={applicationFilters.endTime}
                    onChange={(e) => setApplicationFilters((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button onClick={handleApplicationSearch} className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    搜索
                  </Button>
                  <Button variant="outline" onClick={loadRenewalApplications} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchApproval(true)}
                    disabled={selectedApplications.length === 0 || loading}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    批量通过
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchApproval(false)}
                    disabled={selectedApplications.length === 0 || loading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    批量拒绝
                  </Button>
                </div>
              </div>

              {/* Applications Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            renewalApplications.length > 0 &&
                            renewalApplications
                              .filter((app) => app.status === "PENDING")
                              .every((app) => selectedApplications.includes(app.renewalId))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const pendingIds = renewalApplications
                                .filter((app) => app.status === "PENDING")
                                .map((app) => app.renewalId)
                              setSelectedApplications(pendingIds)
                            } else {
                              setSelectedApplications([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>客户ID</TableHead>
                      <TableHead>客户名称</TableHead>
                      <TableHead>重生原因</TableHead>
                      <TableHead>申请人</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>申请时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            加载中...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : renewalApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无重生申请
                        </TableCell>
                      </TableRow>
                    ) : (
                      renewalApplications.map((app) => (
                        <TableRow key={app.renewalId}>
                          <TableCell>
                            {app.status === "PENDING" && (
                              <Checkbox
                                checked={selectedApplications.includes(app.renewalId)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedApplications((prev) => [...prev, app.renewalId])
                                  } else {
                                    setSelectedApplications((prev) => prev.filter((id) => id !== app.renewalId))
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{app.customerId}</TableCell>
                          <TableCell className="font-medium">{app.customerName}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm leading-relaxed truncate">{app.renewalReason.reason}</p>
                            </div>
                          </TableCell>
                          <TableCell>{app.applicant}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(app.createTime).toLocaleString("zh-CN")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {app.status === "PENDING" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSingleApproval(app.renewalId, true)}
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSingleApproval(app.renewalId, false)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {app.status !== "PENDING" && (
                                <div className="text-xs text-muted-foreground">
                                  {app.approver} |{" "}
                                  {app.approveTime && new Date(app.approveTime).toLocaleString("zh-CN")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Application Pagination */}
              {applicationPagination.total > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    共 {applicationPagination.total} 条记录，第 {applicationPagination.page} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApplicationPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                      disabled={applicationPagination.page <= 1 || loading}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApplicationPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      disabled={
                        applicationPagination.page >=
                          Math.ceil(applicationPagination.total / applicationPagination.size) || loading
                      }
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Submit Renewal Application Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>提交重生申请</DialogTitle>
            <DialogDescription>为违约客户申请重生，恢复正常状态</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <form onSubmit={submitRenewalApplication} className="space-y-4">
              <div className="space-y-2">
                <Label>客户信息</Label>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">客户名称：</span>
                      <span className="font-medium">{selectedCustomer.customerName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">外部等级：</span>
                      <span>{selectedCustomer.latestExternalRating}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">严重程度：</span>
                      {getSeverityBadge(selectedCustomer.severity)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">认定时间：</span>
                      <span>{new Date(selectedCustomer.approveTime).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">违约原因：</span>
                    <span className="text-sm">{selectedCustomer.defaultReasons.join(", ")}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-reason">重生原因 *</Label>
                <Select
                  value={formData.renewalReason.toString()}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, renewalReason: Number.parseInt(value) }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择重生原因" />
                  </SelectTrigger>
                  <SelectContent>
                    {renewalReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id.toString()}>
                        {reason.reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal-remark">重生说明</Label>
                <Textarea
                  id="renewal-remark"
                  placeholder="请输入重生说明..."
                  value={formData.remark}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                />
                <div className="text-xs text-muted-foreground text-right">{formData.remark.length}/1000</div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSubmitDialogOpen(false)} disabled={loading}>
                  取消
                </Button>
                <Button type="submit" disabled={loading || !formData.renewalReason}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      提交中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      提交申请
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalData.approved ? "通过重生申请" : "拒绝重生申请"}</DialogTitle>
            <DialogDescription>请填写审核意见</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-remark">审核意见</Label>
              <Textarea
                id="approval-remark"
                placeholder={approvalData.approved ? "请输入通过理由..." : "请输入拒绝理由..."}
                value={approvalData.remark}
                onChange={(e) => setApprovalData((prev) => ({ ...prev, remark: e.target.value }))}
                rows={4}
                required={!approvalData.approved}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)} disabled={loading}>
              取消
            </Button>
            <Button
              onClick={submitSingleApproval}
              disabled={loading || (!approvalData.approved && !approvalData.remark.trim())}
              className={approvalData.approved ? "" : "bg-destructive hover:bg-destructive/90"}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : approvalData.approved ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {approvalData.approved ? "确认通过" : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </SecureContent>
  )
}
