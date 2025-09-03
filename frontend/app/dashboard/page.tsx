"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Users, AlertTriangle, CheckCircle, FileText, Building2, LogOut, UserPlus } from "lucide-react"
import { DefaultReasonsManagement } from "@/components/default-reasons-management"
import { DefaultApplicationsManagement } from "@/components/default-applications-management"
import { RenewalManagement } from "@/components/renewal-management"
import { StatisticsAnalysis } from "@/components/statistics-analysis"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { apiService } from "@/lib/api-service"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const { user, logout, loading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">加载中...</span>
        </div>
      </div>
    )
  }

  const stats = {
    totalCustomers: 1247,
    defaultCustomers: 89,
    pendingApplications: 23,
    renewalApplications: 12,
  }
  const recentApplications = [
    {
      id: 1,
      customerName: "华润集团有限公司",
      status: "PENDING",
      severity: "HIGH",
      applicant: "张三",
      createTime: "2024-01-15T10:30:00",
    },
    {
      id: 2,
      customerName: "中信建投证券股份有限公司",
      status: "APPROVED",
      severity: "MEDIUM",
      applicant: "李四",
      createTime: "2024-01-14T14:20:00",
    },
    {
      id: 3,
      customerName: "招商银行股份有限公司",
      status: "REJECTED",
      severity: "LOW",
      applicant: "王五",
      createTime: "2024-01-13T09:15:00",
    },
  ]

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">违约客户管理系统</h1>
                <p className="text-sm text-muted-foreground">企业级风险控制与客户管理平台</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                欢迎，{user?.realName} ({user?.role})
              </div>
              {user?.role === "ADMIN" && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/register">
                    <UserPlus className="h-4 w-4 mr-2" />
                    创建用户
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                导出报告
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="reasons">违约原因</TabsTrigger>
            <TabsTrigger value="applications">认定申请</TabsTrigger>
            <TabsTrigger value="renewals">违约重生</TabsTrigger>
            <TabsTrigger value="statistics">统计分析</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总客户数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">较上月增长 +2.1%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">违约客户</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.defaultCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    违约率 {((stats.defaultCustomers / stats.totalCustomers) * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">待审核申请</CardTitle>
                  <FileText className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingApplications}</div>
                  <p className="text-xs text-muted-foreground">需要及时处理</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">重生申请</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.renewalApplications}</div>
                  <p className="text-xs text-muted-foreground">本月新增申请</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle>最近申请</CardTitle>
                <CardDescription>最新的违约认定申请记录</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{app.customerName}</h4>
                          {getStatusBadge(app.status)}
                          {getSeverityBadge(app.severity)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          申请人：{app.applicant} | 申请时间：{new Date(app.createTime).toLocaleString("zh-CN")}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("reasons")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    违约原因管理
                  </CardTitle>
                  <CardDescription>维护和管理违约原因列表</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("applications")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    违约认定申请
                  </CardTitle>
                  <CardDescription>提交新的违约认定申请</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("statistics")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    统计分析
                  </CardTitle>
                  <CardDescription>查看违约趋势和统计数据</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reasons">
            <DefaultReasonsManagement />
          </TabsContent>

          <TabsContent value="applications">
            <DefaultApplicationsManagement />
          </TabsContent>

          <TabsContent value="renewals">
            <RenewalManagement />
          </TabsContent>

          <TabsContent value="statistics">
            <StatisticsAnalysis />
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}
