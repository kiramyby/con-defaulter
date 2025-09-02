"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { mockApi } from "@/lib/mock-api"
import CanvasGreenBackground from "@/components/ui/CanvasGreenBackground"

interface LoginFormValues {
  username: string
  password: string
  userType: "employee" | "admin"
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const form = useForm<LoginFormValues>({
    defaultValues: {
      username: "",
      password: "",
      userType: "employee"
    }
  })

  async function onSubmit(data: LoginFormValues) {
    try {
      const response = await mockApi.login(data)
      // 存储用户信息到Cookie（而非localStorage）
      document.cookie = `user=${encodeURIComponent(JSON.stringify(response.data))}; path=/; max-age=86400`
      // 重定向到仪表盘
      console.log('登录成功', response.data);
      
      router.push("/defaults")
      // router.refresh()
    } catch (err) {
      setError("用户名或密码错误")
    }
  }

  
  return (
    <CanvasGreenBackground>
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md min-w-[400px]">
          <CardHeader>
            <CardTitle>违约客户管理系统</CardTitle>
            <CardDescription>请输入账号密码登录</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入用户名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="请输入密码" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户类型</FormLabel>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-row gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="employee" id="employee" />
                          <Label htmlFor="employee">员工</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="admin" id="admin" />
                          <Label htmlFor="admin">管理员</Label>
                        </div>
                      </RadioGroup>
                    </FormItem>
                  )}
                />
                {error && (
                  <p className="text-sm text-destructive mt-2">{error}</p>
                )}
                <Button type="submit" className="w-full mt-4">登录</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </CanvasGreenBackground>
    
  )
}