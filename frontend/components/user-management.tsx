"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, RefreshCw, Edit, Trash2, Key, UserCheck, UserX } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { usePermissions, RequirePermission } from "@/components/permissions-guard"
import { useErrorHandler } from "@/lib/error-handler"
import type { 
  User, 
  UsersResponse,
  CreateUserData,
  UpdateUserData,
  GetUsersParams
} from "@/lib/api-types"

export function UserManagement() {
  const { user: currentUser } = useAuth()
  const permissions = usePermissions(currentUser)
  const { toast } = useToast()
  const { handle: handleError } = useErrorHandler()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
  })
  
  const [filters, setFilters] = useState<GetUsersParams>({
    keyword: "",
    role: undefined,
    status: undefined,
  })
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  const [createFormData, setCreateFormData] = useState<CreateUserData>({
    username: "",
    realName: "",
    email: "",
    phone: "",
    department: "",
    role: "OPERATOR",
    password: "",
  })
  
  const [editFormData, setEditFormData] = useState<UpdateUserData>({
    username: "",
    realName: "",
    email: "",
    phone: "",
    department: "",
    role: "OPERATOR",
    status: "ACTIVE",
  })
  
  const [newPassword, setNewPassword] = useState("")

  const loadUsers = async () => {
    if (!permissions.hasPermission("MANAGE_USERS")) {
      return
    }
    
    setLoading(true)
    try {
      const response = await apiService.getUsers({
        page: pagination.page,
        size: pagination.size,
        ...filters,
      })

      setUsers(response.list || [])
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }))
    } catch (error: any) {
      handleError(error, "加载用户列表")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [pagination.page, pagination.size])

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    loadUsers()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await apiService.createUser(createFormData)
      toast({
        title: "创建成功",
        description: "用户已成功创建",
      })
      
      setIsCreateDialogOpen(false)
      setCreateFormData({
        username: "",
        realName: "",
        email: "",
        phone: "",
        department: "",
        role: "OPERATOR",
        password: "",
      })
      loadUsers()
    } catch (error: any) {
      handleError(error, "创建用户")
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    
    setLoading(true)
    try {
      await apiService.updateUser(editingUser.dbId, editFormData)
      toast({
        title: "更新成功",
        description: "用户信息已更新",
      })
      
      setIsEditDialogOpen(false)
      setEditingUser(null)
      loadUsers()
    } catch (error: any) {
      handleError(error, "更新用户")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    setLoading(true)
    try {
      await apiService.deleteUser(userId)
      toast({
        title: "删除成功",
        description: "用户已删除",
      })
      loadUsers()
    } catch (error: any) {
      handleError(error, "删除用户")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser) return
    
    setLoading(true)
    try {
      await apiService.resetUserPassword(editingUser.dbId, newPassword)
      toast({
        title: "重置成功",
        description: "密码已重置",
      })
      
      setIsPasswordDialogOpen(false)
      setNewPassword("")
      setEditingUser(null)
    } catch (error: any) {
      handleError(error, "重置密码")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: "",
      department: user.department,
      role: user.role,
      status: user.status,
    })
    setIsEditDialogOpen(true)
  }

  const openPasswordDialog = (user: User) => {
    setEditingUser(user)
    setNewPassword("")
    setIsPasswordDialogOpen(true)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive">管理员</Badge>
      case "OPERATOR":
        return <Badge variant="default">操作员</Badge>
      case "AUDITOR":
        return <Badge variant="secondary">审核员</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default">启用</Badge>
      case "INACTIVE":
        return <Badge variant="destructive">禁用</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <RequirePermission permission="MANAGE_USERS">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>用户管理</CardTitle>
              <CardDescription>管理系统用户账号</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建用户
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">用户列表</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="keyword">关键词搜索</Label>
                  <Input
                    id="keyword"
                    placeholder="用户名、姓名、邮箱..."
                    value={filters.keyword || ""}
                    onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <Select value={filters.role || ""} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, role: value as any || undefined }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部角色</SelectItem>
                      <SelectItem value="ADMIN">管理员</SelectItem>
                      <SelectItem value="OPERATOR">操作员</SelectItem>
                      <SelectItem value="AUDITOR">审核员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select value={filters.status || ""} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, status: value as any || undefined }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部状态</SelectItem>
                      <SelectItem value="ACTIVE">启用</SelectItem>
                      <SelectItem value="INACTIVE">禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    搜索
                  </Button>
                  <Button variant="outline" onClick={loadUsers} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>序号</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell>{(pagination.page - 1) * pagination.size + index + 1}</TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.realName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(user)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPasswordDialog(user)}
                                className="h-8 w-8 p-0"
                              >
                                <Key className="h-3 w-3" />
                              </Button>
                              {user.id !== currentUser?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        确定要删除用户 "{user.realName}" 吗？此操作不可撤销。
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteUser(user.dbId)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        删除
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
              {pagination.total > pagination.size && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    显示 {(pagination.page - 1) * pagination.size + 1} 到{" "}
                    {Math.min(pagination.page * pagination.size, pagination.total)} 项，
                    共 {pagination.total} 项
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1 || loading}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page * pagination.size >= pagination.total || loading}
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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>创建用户</DialogTitle>
            <DialogDescription>创建新的系统用户账号</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名 *</Label>
                <Input
                  id="username"
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="realName">真实姓名 *</Label>
                <Input
                  id="realName"
                  value={createFormData.realName}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, realName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱 *</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">部门</Label>
                <Input
                  id="department"
                  value={createFormData.department}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">角色 *</Label>
              <Select 
                value={createFormData.role} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  <SelectItem value="OPERATOR">操作员</SelectItem>
                  <SelectItem value="AUDITOR">审核员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改用户信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">用户名 *</Label>
                <Input
                  id="edit-username"
                  value={editFormData.username || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-realName">真实姓名 *</Label>
                <Input
                  id="edit-realName"
                  value={editFormData.realName || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, realName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">邮箱 *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email || ""}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">电话</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">部门</Label>
                <Input
                  id="edit-department"
                  value={editFormData.department || ""}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">角色 *</Label>
              <Select 
                value={editFormData.role || "OPERATOR"} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  <SelectItem value="OPERATOR">操作员</SelectItem>
                  <SelectItem value="AUDITOR">审核员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">状态</Label>
              <Select 
                value={editFormData.status || "ACTIVE"} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">启用</SelectItem>
                  <SelectItem value="INACTIVE">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              为用户 "{editingUser?.realName}" 设置新密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码 *</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={loading || !newPassword.trim()}
            >
              {loading ? "重置中..." : "重置密码"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RequirePermission>
  )
}