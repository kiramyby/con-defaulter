"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart3, PieChart, LineChart } from "lucide-react"
import * as echarts from "echarts"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/lib/permissions"
import { SecureContent } from "@/components/secure-content"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

interface StatisticsData {
  year: number
  type: string
  total: number
  industries?: Array<{
    industry: string
    count: number
    percentage: number
    trend: string
  }>
  regions?: Array<{
    region: string
    count: number
    percentage: number
    trend: string
  }>
}

interface TrendData {
  dimension: string
  target: string
  trend: Array<{
    year: number
    defaultCount: number
    renewalCount: number
  }>
}

export function StatisticsAnalysis() {
  const { user } = useAuth()
  const permissions = usePermissions(user)
  const [loading, setLoading] = useState(false)
  const [industryData, setIndustryData] = useState<StatisticsData | null>(null)
  const [regionData, setRegionData] = useState<StatisticsData | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedType, setSelectedType] = useState<"DEFAULT" | "RENEWAL">("DEFAULT")
  const [trendParams, setTrendParams] = useState({
    startYear: new Date().getFullYear() - 2,
    endYear: new Date().getFullYear(),
    dimension: "INDUSTRY" as "INDUSTRY" | "REGION",
    target: "test",
  })
  const { toast } = useToast()

  const industryPieRef = useRef<HTMLDivElement>(null)
  const industryBarRef = useRef<HTMLDivElement>(null)
  const regionPieRef = useRef<HTMLDivElement>(null)
  const regionBarRef = useRef<HTMLDivElement>(null)
  const trendLineRef = useRef<HTMLDivElement>(null)

  const loadStatistics = async () => {
    // 检查权限，避免无权限时仍然加载数据
    if (!permissions.hasAnyPermission(["VIEW_BASIC_STATISTICS", "VIEW_STATISTICS", "ADVANCED_ANALYTICS"])) {
      return
    }
    
    setLoading(true)
    try {
      const [industryResponse, regionResponse] = await Promise.all([
        apiService.getStatisticsByIndustry({ year: selectedYear, type: selectedType }),
        apiService.getStatisticsByRegion({ year: selectedYear, type: selectedType }),
      ])

      setIndustryData(industryResponse)
      setRegionData(regionResponse)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "统计数据加载失败，请重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTrendData = async () => {
    // 检查权限，避免无权限时仍然加载数据
    if (!permissions.hasAnyPermission(["VIEW_STATISTICS", "ADVANCED_ANALYTICS"])) {
      return
    }
    
    setLoading(true)
    try {
      const response = await apiService.getTrendStatistics(trendParams)
      setTrendData(response)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "趋势数据加载失败，请重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const initIndustryPieChart = () => {
    if (!industryPieRef.current || !industryData?.industries) return

    const chart = echarts.init(industryPieRef.current)
    const option = {
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        left: "left",
        data: industryData.industries.map((item) => item.industry),
      },
      series: [
        {
          name: "行业分布",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: industryData.industries.map((item, index) => ({
            value: item.count,
            name: item.industry,
            itemStyle: {
              color: COLORS[index % COLORS.length],
            },
          })),
        },
      ],
    }
    chart.setOption(option)

    const resizeHandler = () => chart.resize()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
      chart.dispose()
    }
  }

  const initIndustryBarChart = () => {
    if (!industryBarRef.current || !industryData?.industries) return

    const chart = echarts.init(industryBarRef.current)
    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: industryData.industries.map((item) => item.industry),
        axisTick: {
          alignWithLabel: true,
        },
      },
      yAxis: {
        type: "value",
      },
      series: [
        {
          name: "客户数量",
          type: "bar",
          barWidth: "60%",
          data: industryData.industries.map((item, index) => ({
            value: item.count,
            itemStyle: {
              color: COLORS[index % COLORS.length],
            },
          })),
        },
      ],
    }
    chart.setOption(option)

    const resizeHandler = () => chart.resize()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
      chart.dispose()
    }
  }

  const initRegionPieChart = () => {
    if (!regionPieRef.current || !regionData?.regions) return

    const chart = echarts.init(regionPieRef.current)
    const option = {
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        left: "left",
        data: regionData.regions.map((item) => item.region),
      },
      series: [
        {
          name: "区域分布",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: false,
            position: "center",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: "bold",
            },
          },
          labelLine: {
            show: false,
          },
          data: regionData.regions.map((item, index) => ({
            value: item.count,
            name: item.region,
            itemStyle: {
              color: COLORS[index % COLORS.length],
            },
          })),
        },
      ],
    }
    chart.setOption(option)

    const resizeHandler = () => chart.resize()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
      chart.dispose()
    }
  }

  const initRegionBarChart = () => {
    if (!regionBarRef.current || !regionData?.regions) return

    const chart = echarts.init(regionBarRef.current)
    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: regionData.regions.map((item) => item.region),
        axisTick: {
          alignWithLabel: true,
        },
      },
      yAxis: {
        type: "value",
      },
      series: [
        {
          name: "客户数量",
          type: "bar",
          barWidth: "60%",
          data: regionData.regions.map((item, index) => ({
            value: item.count,
            itemStyle: {
              color: COLORS[index % COLORS.length],
            },
          })),
        },
      ],
    }
    chart.setOption(option)

    const resizeHandler = () => chart.resize()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
      chart.dispose()
    }
  }

  const initTrendLineChart = () => {
    if (!trendLineRef.current || !trendData?.trend) return

    const chart = echarts.init(trendLineRef.current)
    const option = {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["违约数量", "重生数量"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      toolbox: {
        feature: {
          saveAsImage: {},
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: trendData.trend.map((item) => item.year + "年"),
      },
      yAxis: {
        type: "value",
      },
      series: [
        {
          name: "违约数量",
          type: "line",
          stack: "Total",
          data: trendData.trend.map((item) => item.defaultCount),
          itemStyle: {
            color: "#FF8042",
          },
          lineStyle: {
            width: 3,
          },
        },
        {
          name: "重生数量",
          type: "line",
          stack: "Total",
          data: trendData.trend.map((item) => item.renewalCount),
          itemStyle: {
            color: "#00C49F",
          },
          lineStyle: {
            width: 3,
          },
        },
      ],
    }
    chart.setOption(option)

    const resizeHandler = () => chart.resize()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
      chart.dispose()
    }
  }

  useEffect(() => {
    if (industryData?.industries) {
      const cleanup1 = initIndustryPieChart()
      const cleanup2 = initIndustryBarChart()
      return () => {
        cleanup1?.()
        cleanup2?.()
      }
    }
  }, [industryData])

  useEffect(() => {
    if (regionData?.regions) {
      const cleanup1 = initRegionPieChart()
      const cleanup2 = initRegionBarChart()
      return () => {
        cleanup1?.()
        cleanup2?.()
      }
    }
  }, [regionData])

  useEffect(() => {
    if (trendData?.trend) {
      const cleanup = initTrendLineChart()
      return cleanup
    }
  }, [trendData])

  useEffect(() => {
    loadStatistics()
  }, [selectedYear, selectedType])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "UP":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "DOWN":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "UP":
        return "text-red-500"
      case "DOWN":
        return "text-green-500"
      default:
        return "text-gray-500"
    }
  }

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "UP":
        return "上升"
      case "DOWN":
        return "下降"
      default:
        return "稳定"
    }
  }

  return (
    <SecureContent permission="VIEW_STATISTICS">
      <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            统计分析控制面板
          </CardTitle>
          <CardDescription>选择统计年份和类型来查看不同维度的数据分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">统计年份:</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
              >
                <SelectTrigger className="w-32 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">统计类型:</label>
              <Select value={selectedType} onValueChange={(value: "DEFAULT" | "RENEWAL") => setSelectedType(value)}>
                <SelectTrigger className="w-32 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFAULT">违约统计</SelectItem>
                  <SelectItem value="RENEWAL">重生统计</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="industry" className="space-y-4">
        <TabsList className={`grid w-full ${permissions.hasPermission("ADVANCED_ANALYTICS") ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="industry">按行业统计</TabsTrigger>
          <TabsTrigger value="region">按区域统计</TabsTrigger>
          {permissions.hasPermission("ADVANCED_ANALYTICS") && (
            <TabsTrigger value="trend">趋势分析</TabsTrigger>
          )}
        </TabsList>

        {/* 按行业统计 */}
        <TabsContent value="industry" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 行业统计概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  行业分布概览
                </CardTitle>
                <CardDescription>
                  {selectedYear}年{selectedType === "DEFAULT" ? "违约" : "重生"}客户行业分布情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : industryData ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{industryData.total}</div>
                      <div className="text-sm text-muted-foreground">总计客户数</div>
                    </div>
                    <div ref={industryPieRef} style={{ width: "100%", height: "200px" }} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* 行业详细数据 */}
            <Card>
              <CardHeader>
                <CardTitle>行业详细统计</CardTitle>
                <CardDescription>各行业具体数量、占比和趋势信息</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : industryData?.industries ? (
                  <div className="space-y-3">
                    {industryData.industries.map((item, index) => (
                      <div key={item.industry} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <div className="font-medium">{item.industry}</div>
                            <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.count}家</Badge>
                          <div className={`flex items-center gap-1 ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}
                            <span className="text-sm">{getTrendText(item.trend)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* 行业柱状图 */}
          <Card>
            <CardHeader>
              <CardTitle>行业对比图表</CardTitle>
              <CardDescription>各行业客户数量对比</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : industryData?.industries ? (
                <div ref={industryBarRef} style={{ width: "100%", height: "300px" }} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 按区域统计 */}
        <TabsContent value="region" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 区域统计概览 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  区域分布概览
                </CardTitle>
                <CardDescription>
                  {selectedYear}年{selectedType === "DEFAULT" ? "违约" : "重生"}客户区域分布情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : regionData ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{regionData.total}</div>
                      <div className="text-sm text-muted-foreground">总计客户数</div>
                    </div>
                    <div ref={regionPieRef} style={{ width: "100%", height: "200px" }} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* 区域详细数据 */}
            <Card>
              <CardHeader>
                <CardTitle>区域详细统计</CardTitle>
                <CardDescription>各区域具体数量、占比和趋势信息</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : regionData?.regions ? (
                  <div className="space-y-3">
                    {regionData.regions.map((item, index) => (
                      <div key={item.region} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <div>
                            <div className="font-medium">{item.region}</div>
                            <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{item.count}家</Badge>
                          <div className={`flex items-center gap-1 ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}
                            <span className="text-sm">{getTrendText(item.trend)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* 区域柱状图 */}
          <Card>
            <CardHeader>
              <CardTitle>区域对比图表</CardTitle>
              <CardDescription>各区域客户数量对比</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : regionData?.regions ? (
                <div ref={regionBarRef} style={{ width: "100%", height: "300px" }} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 趋势分析 */}
        {permissions.hasPermission("ADVANCED_ANALYTICS") && (
          <TabsContent value="trend" className="space-y-4">
          {/* 趋势分析控制面板 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                趋势分析设置
              </CardTitle>
              <CardDescription>设置趋势分析的时间范围和维度</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">开始年份:</label>
                  <Select
                    value={trendParams.startYear.toString()}
                    onValueChange={(value) =>
                      setTrendParams((prev) => ({ ...prev, startYear: Number.parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">结束年份:</label>
                  <Select
                    value={trendParams.endYear.toString()}
                    onValueChange={(value) => setTrendParams((prev) => ({ ...prev, endYear: Number.parseInt(value) }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">分析维度:</label>
                  <Select
                    value={trendParams.dimension}
                    onValueChange={(value: "INDUSTRY" | "REGION") =>
                      setTrendParams((prev) => ({ ...prev, dimension: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDUSTRY">按行业</SelectItem>
                      <SelectItem value="REGION">按区域</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={loadTrendData} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  生成趋势分析
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 趋势图表 */}
          {trendData && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {trendData.dimension === "INDUSTRY" ? "行业" : "区域"}趋势分析 - {trendData.target}
                </CardTitle>
                <CardDescription>
                  {trendParams.startYear}年至{trendParams.endYear}年的违约和重生趋势变化
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div ref={trendLineRef} style={{ width: "100%", height: "400px" }} />
              </CardContent>
            </Card>
          )}
          </TabsContent>
        )}
      </Tabs>
      </div>
    </SecureContent>
  )
}
