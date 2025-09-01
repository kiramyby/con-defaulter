"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react"
import { mockApi, type DefaultReason } from "@/lib/mock-api"
import { useToast } from "@/hooks/use-toast"

interface DefaultReasonsListResponse {
  total: number
  page: number
  size: number
  list: DefaultReason[]
}

export function DefaultReasonsManagement() {
  const [reasons, setReasons] = useState<DefaultReason[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
  })
  const [filters, setFilters] = useState({
    enabled: undefined as boolean | undefined,
  })
  const [editingReason, setEditingReason] = useState<DefaultReason | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    reason: "",
    enabled: true,
    sortOrder: 1,
  })

  const { toast } = useToast()

  // Load reasons data
  const loadReasons = async () => {
    setLoading(true)
    try {
      const response = await mockApi.getDefaultReasons({
        page: pagination.page,
        size: pagination.size,
        enabled: filters.enabled,
      })

      const data = response.data as DefaultReasonsListResponse
      setReasons(data.list)
      setPagination((prev) => ({
        ...prev,
        total: data.total,
      }))
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载违约原因列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReasons()
  }, [pagination.page, pagination.size, filters.enabled])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.reason.trim()) {
      toast({
        title: "验证失败",
        description: "违约原因不能为空",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (editingReason) {
        await mockApi.updateDefaultReason(editingReason.id, formData)
        toast({
          title: "更新成功",
          description: "违约原因已更新",
        })
      } else {
        await mockApi.createDefaultReason(formData)
        toast({
          title: "创建成功",
          description: "违约原因已创建",
        })
      }

      setIsDialogOpen(false)
      setEditingReason(null)
      setFormData({ reason: "", enabled: true, sortOrder: 1 })
      loadReasons()
    } catch (error) {
      toast({
        title: "操作失败",
        description: editingReason ? "更新违约原因失败" : "创建违约原因失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    setLoading(true)
    try {
      await mockApi.deleteDefaultReason(id)
      toast({
        title: "删除成功",
        description: "违约原因已删除",
      })
      loadReasons()
    } catch (error) {
      toast({
        title: "删除失败",
        description: "无法删除违约原因",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle edit
  const handleEdit = (reason: DefaultReason) => {
    setEditingReason(reason)
    setFormData({
      reason: reason.reason,
      enabled: reason.enabled,
      sortOrder: reason.sortOrder,
    })
    setIsDialogOpen(true)
  }

  // Handle add new
  const handleAddNew = () => {
    setEditingReason(null)
    setFormData({ reason: "", enabled: true, sortOrder: reasons.length + 1 })
    setIsDialogOpen(true)
  }

  // Handle status toggle
  const handleStatusToggle = async (reason: DefaultReason) => {
    try {
      await mockApi.updateDefaultReason(reason.id, { enabled: !reason.enabled })
      toast({
        title: "状态更新成功",
        description: `违约原因已${!reason.enabled ? "启用" : "禁用"}`,
      })
      loadReasons()
    } catch (error) {
      toast({
        title: "状态更新失败",
        description: "无法更新违约原因状态",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>违约原因管理</CardTitle>
              <CardDescription>管理系统中的违约原因配置，支持启用/禁用和排序</CardDescription>
            </div>
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新增原因
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">状态筛选：</Label>
              <Select
                value={filters.enabled === undefined ? "all" : filters.enabled.toString()}
                onValueChange={(value) => {
                  setFilters({
                    enabled: value === "all" ? undefined : value === "true",
                  })
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">已启用</SelectItem>
                  <SelectItem value="false">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadReasons}
              disabled={loading}
              className="flex items-center gap-2 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">序号</TableHead>
                  <TableHead>违约原因</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-24">排序</TableHead>
                  <TableHead className="w-40">创建时间</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        加载中...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reasons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  reasons.map((reason, index) => (
                    <TableRow key={reason.id}>
                      <TableCell>{(pagination.page - 1) * pagination.size + index + 1}</TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm leading-relaxed">{reason.reason}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reason.enabled}
                            onCheckedChange={() => handleStatusToggle(reason)}
                            size="sm"
                          />
                          <Badge variant={reason.enabled ? "default" : "secondary"}>
                            {reason.enabled ? "启用" : "禁用"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{reason.sortOrder}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(reason.createTime).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(reason)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive bg-transparent"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除这个违约原因吗？此操作不可撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(reason.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReason ? "编辑违约原因" : "新增违约原因"}</DialogTitle>
            <DialogDescription>
              {editingReason ? "修改违约原因的详细信息" : "添加新的违约原因到系统中"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">违约原因 *</Label>
              <Textarea
                id="reason"
                placeholder="请输入违约原因描述..."
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                rows={4}
                maxLength={500}
                required
              />
              <div className="text-xs text-muted-foreground text-right">{formData.reason.length}/500</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">排序号</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="1"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sortOrder: Number.parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enabled">状态</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))}
                  />
                  <span className="text-sm">{formData.enabled ? "启用" : "禁用"}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {editingReason ? "更新中..." : "创建中..."}
                  </div>
                ) : editingReason ? (
                  "更新"
                ) : (
                  "创建"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
