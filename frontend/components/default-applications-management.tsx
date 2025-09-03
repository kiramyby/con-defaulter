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
import { Plus, Search, RefreshCw, Eye, CheckCircle, XCircle, Upload, FileText } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"

interface DefaultApplication {
  applicationId: number
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

interface DefaultReason {
  id: number
  reason: string
  enabled: boolean
  sortOrder: number
}

interface DefaultApplicationsListResponse {
  total: number
  page: number
  size: number
  list: DefaultApplication[]
}

export function DefaultApplicationsManagement() {
  const [activeTab, setActiveTab] = useState("list")
  const [applications, setApplications] = useState<DefaultApplication[]>([])
  const [defaultReasons, setDefaultReasons] = useState<DefaultReason[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
  })
  const [filters, setFilters] = useState({
    customerName: "",
    status: "",
    startTime: "",
    endTime: "",
  })
  const [selectedApplications, setSelectedApplications] = useState<number[]>([])
  const [viewingApplication, setViewingApplication] = useState<DefaultApplication | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvalData, setApprovalData] = useState({
    applicationId: 0,
    approved: true,
    remark: "",
  })

  // Form data for new application
  const [formData, setFormData] = useState({
    customerName: "",
    latestExternalRating: "",
    defaultReasons: [] as number[],
    severity: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
    remark: "",
    attachments: [] as Array<{ fileName: string; fileUrl: string; fileSize: number }>,
  })

  const { toast } = useToast()

  const loadApplications = async () => {
    setLoading(true)
    try {
      const response = await apiService.getDefaultApplications({
        page: pagination.page,
        size: pagination.size,
        customerName: filters.customerName || undefined,
        status: filters.status || undefined,
        startTime: filters.startTime || undefined,
        endTime: filters.endTime || undefined,
      })

      setApplications(response.list)
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }))
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载申请列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDefaultReasons = async () => {
    try {
      const response = await apiService.getDefaultReasons({ enabled: true })
      setDefaultReasons(response.list)
    } catch (error) {
      console.error("Failed to load default reasons:", error)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [pagination.page, pagination.size])

  useEffect(() => {
    loadDefaultReasons()
  }, [])

  // Handle search
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    loadApplications()
  }

  const handleViewApplication = async (applicationId: number) => {
    try {
      const response = await apiService.getDefaultApplicationDetail(applicationId)
      setViewingApplication(response)
      setIsViewDialogOpen(true)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载申请详情",
        variant: "destructive",
      })
    }
  }

  // Handle single approval
  const handleSingleApproval = (applicationId: number, approved: boolean) => {
    setApprovalData({
      applicationId,
      approved,
      remark: "",
    })
    setIsApprovalDialogOpen(true)
  }

  const submitSingleApproval = async () => {
    setLoading(true)
    try {
      console.log("approvalData", JSON.stringify(approvalData))
      await apiService.approveDefaultApplication(approvalData.applicationId, {
        approved: approvalData.approved,
        remark: approvalData.remark,
      })
      toast({
        title: "审核成功",
        description: `申请已${approvalData.approved ? "通过" : "拒绝"}`,
      })
      setIsApprovalDialogOpen(false)
      setApprovalData({ applicationId: 0, approved: true, remark: "" })
      loadApplications()
    } catch (error) {
      console.error("Failed to submit single approval:", error)
      console.log(JSON.stringify(approvalData))
      toast({
        title: "审核失败",
        description: "无法完成审核操作",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

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
        applicationId: id,
        approved,
        remark: approved ? "批量通过" : "批量拒绝",
      }))

      await apiService.batchApproveDefaultApplications(batchData)
      toast({
        title: "批量审核成功",
        description: `已${approved ? "通过" : "拒绝"} ${selectedApplications.length} 个申请`,
      })
      setSelectedApplications([])
      loadApplications()
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

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerName.trim()) {
      toast({
        title: "验证失败",
        description: "客户名称不能为空",
        variant: "destructive",
      })
      return
    }

    if (formData.defaultReasons.length === 0) {
      toast({
        title: "验证失败",
        description: "请至少选择一个违约原因",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await apiService.createDefaultApplication({
        customerName: formData.customerName,
        latestExternalRating: formData.latestExternalRating || undefined,
        defaultReasons: formData.defaultReasons,
        severity: formData.severity,
        remark: formData.remark || undefined,
        attachments: formData.attachments.length > 0 ? formData.attachments : undefined,
      })

      toast({
        title: "提交成功",
        description: "违约认定申请已提交",
      })

      // Reset form
      setFormData({
        customerName: "",
        latestExternalRating: "",
        defaultReasons: [],
        severity: "MEDIUM",
        remark: "",
        attachments: [],
      })
      setActiveTab("list")
      loadApplications()
    } catch (error: any) {
      toast({
        title: "提交失败",
        description: error.message || "无法提交申请",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "文件大小不能超过10MB",
        variant: "destructive",
      })
      return
    }

    // Validate file type
    const allowedTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx"]
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "文件格式不支持",
        description: "仅支持 PDF、DOC、DOCX、XLS、XLSX 格式",
        variant: "destructive",
      })
      return
    }

    try {
      const uploadedFile = await apiService.uploadFile(file)

      setFormData((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            fileName: uploadedFile.fileName,
            fileUrl: uploadedFile.fileUrl,
            fileSize: uploadedFile.fileSize,
          },
        ],
      }))

      toast({
        title: "上传成功",
        description: "文件已上传",
      })
    } catch (error) {
      toast({
        title: "上传失败",
        description: "无法上传文件",
        variant: "destructive",
      })
    }

    // Reset input
    event.target.value = ""
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
  console.log(JSON.stringify(applications))
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>违约认定申请管理</CardTitle>
              <CardDescription>管理违约认定申请的提交、查询和审核流程</CardDescription>
            </div>
            <Button onClick={() => setActiveTab("submit")} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新增申请
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">申请列表</TabsTrigger>
              <TabsTrigger value="submit">提交申请</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="customer-search">客户名称</Label>
                  <Input
                    id="customer-search"
                    className="bg-white"
                    placeholder="搜索客户名称..."
                    value={filters.customerName}
                    onChange={(e) => setFilters((prev) => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-filter">审核状态</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="选择状态"  />
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
                  <Label htmlFor="start-time" >开始时间</Label>
                  <Input
                    id="start-time"
                    type="date"
                    className="bg-white"
                    value={filters.startTime}
                    onChange={(e) => setFilters((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">结束时间</Label>
                  <Input
                    id="end-time"
                    type="date"
                    value={filters.endTime}
                    className="bg-white"
                    onChange={(e) => setFilters((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSearch} className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    搜索
                  </Button>
                  <Button variant="outline" onClick={loadApplications} disabled={loading}>
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

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            applications.length > 0 &&
                            applications
                              .filter((app) => app.status === "PENDING")
                              .every((app) => selectedApplications.includes(app.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const pendingIds = applications
                                .filter((app) => app.status === "PENDING")
                                .map((app) => app.id)
                              setSelectedApplications(pendingIds)
                            } else {
                              setSelectedApplications([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>客户ID</TableHead>
                      <TableHead>客户名称</TableHead>
                      <TableHead>申请人</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>严重程度</TableHead>
                      <TableHead>违约原因</TableHead>
                      <TableHead>申请时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            加载中...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            {app.status === "PENDING" && (
                              <Checkbox
                                checked={selectedApplications.includes(app.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedApplications((prev) => [...prev, app.id])
                                  } else {
                                    setSelectedApplications((prev) => prev.filter((id) => id !== app.id))
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{app.customerId}</TableCell>
                          <TableCell className="font-medium">{app.customerName}</TableCell>
                          <TableCell>{app.applicant}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>{getSeverityBadge(app.severity)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm text-muted-foreground truncate">
                                {app.defaultReasons.map((r) => `原因${r}`).join(", ")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(app.createTime).toLocaleString("zh-CN")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewApplication(app.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              {app.status === "PENDING" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSingleApproval(app.applicationId, true)}
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSingleApproval(app.applicationId, false)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    共 {pagination.total} 条记录，第 {pagination.page} 页
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1 || loading}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.size) || loading}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="submit" className="space-y-4">
              <form onSubmit={handleSubmitApplication} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">客户名称 *</Label>
                    <Input
                      id="customer-name"
                      placeholder="请输入客户名称"
                      value={formData.customerName}
                      className="bg-white"
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="external-rating">最新外部等级</Label>
                    <Input
                      id="external-rating"
                      placeholder="如：AAA、AA+、A等"
                      value={formData.latestExternalRating}
                      className="bg-white"
                      onChange={(e) => setFormData((prev) => ({ ...prev, latestExternalRating: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>违约原因 *</Label>
                  <div className="grid grid-cols-1 gap-3 p-4 border rounded-lg max-h-60 overflow-y-auto">
                    {defaultReasons.map((reason) => (
                      <div key={reason.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`reason-${reason.id}`}
                          checked={formData.defaultReasons.includes(reason.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData((prev) => ({
                                ...prev,
                                defaultReasons: [...prev.defaultReasons, reason.id],
                              }))
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                defaultReasons: prev.defaultReasons.filter((id) => id !== reason.id),
                              }))
                            }
                          }}
                        />
                        <Label htmlFor={`reason-${reason.id}`} className="text-sm leading-relaxed cursor-pointer">
                          {reason.reason}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">严重程度 *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value: "HIGH" | "MEDIUM" | "LOW") =>
                      setFormData((prev) => ({ ...prev, severity: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">高</SelectItem>
                      <SelectItem value="MEDIUM">中</SelectItem>
                      <SelectItem value="LOW">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remark">备注信息</Label>
                  <Textarea
                    id="remark"
                    placeholder="请输入备注信息..."
                    value={formData.remark}
                    onChange={(e) => setFormData((prev) => ({ ...prev, remark: e.target.value }))}
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="text-xs text-muted-foreground text-right">{formData.remark.length}/1000</div>
                </div>

                <div className="space-y-2">
                  <Label>附件</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileUpload}
                        className="hidden bg-white"
                        id="file-upload"
                      />
                      <Label
                        htmlFor="file-upload"
                        className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                      >
                        <Upload className="h-4 w-4" />
                        上传文件
                      </Label>
                      <span className="text-xs text-muted-foreground">支持 PDF、DOC、DOCX、XLS、XLSX，最大10MB</span>
                    </div>
                    {formData.attachments.length > 0 && (
                      <div className="space-y-2">
                        {formData.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{file.fileName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.fileSize / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== index),
                                }))
                              }
                            >
                              删除
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" disabled={loading} className="flex items-center gap-2">
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        提交申请
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        customerName: "",
                        latestExternalRating: "",
                        defaultReasons: [],
                        severity: "MEDIUM",
                        remark: "",
                        attachments: [],
                      })
                    }}
                  >
                    重置
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Application Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申请详情</DialogTitle>
            <DialogDescription>查看违约认定申请的详细信息</DialogDescription>
          </DialogHeader>
          {viewingApplication && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">申请ID</Label>
                  <p className="text-sm">{viewingApplication.id}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">客户名称</Label>
                  <p className="text-sm font-medium">{viewingApplication.customerName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">最新外部等级</Label>
                  <p className="text-sm">{viewingApplication.latestExternalRating || "未提供"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">严重程度</Label>
                  <div>{getSeverityBadge(viewingApplication.severity)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">申请人</Label>
                  <p className="text-sm">{viewingApplication.applicant}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">申请状态</Label>
                  <div>{getStatusBadge(viewingApplication.status)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">申请时间</Label>
                  <p className="text-sm">{new Date(viewingApplication.createTime).toLocaleString("zh-CN")}</p>
                </div>
                {viewingApplication.approveTime && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">审核时间</Label>
                    <p className="text-sm">{new Date(viewingApplication.approveTime).toLocaleString("zh-CN")}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">违约原因</Label>
                <div className="space-y-2">
                  {viewingApplication.defaultReasons.map((reason, index) => (
                    <div key={reason.id} className="p-3 border rounded-lg">
                      <p className="text-sm leading-relaxed">
                        {index + 1}. {reason.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {viewingApplication.remark && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">备注信息</Label>
                  <p className="text-sm p-3 border rounded-lg bg-muted/50">{viewingApplication.remark}</p>
                </div>
              )}

              {viewingApplication.attachments && viewingApplication.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">附件</Label>
                  <div className="space-y-2">
                    {viewingApplication.attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.fileSize / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingApplication.approver && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">审核人</Label>
                  <p className="text-sm">{viewingApplication.approver}</p>
                </div>
              )}

              {viewingApplication.approveRemark && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">审核意见</Label>
                  <p className="text-sm p-3 border rounded-lg bg-muted/50">{viewingApplication.approveRemark}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalData.approved ? "通过申请" : "拒绝申请"}</DialogTitle>
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
  )
}
