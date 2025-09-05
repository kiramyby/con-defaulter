"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ErrorHandler } from "./error-handler"

interface User {
  id: string
  email: string
  dbId: number
  username: string
  realName: string
  role: "ADMIN" | "OPERATOR" | "AUDITOR"
  status: "ACTIVE" | "INACTIVE"
  department: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (userData: RegisterData) => Promise<void>
  loading: boolean
  isAuthenticated: boolean
}

interface RegisterData {
  username: string
  realName: string
  email: string
  phone?: string
  department?: string
  role: "ADMIN" | "OPERATOR" | "AUDITOR"
  password: string
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: User
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const API_BASE_URL = "https://server.kiracoon.top/api/v1"

  // Initialize auth state from localStorage
  useEffect(() => {
    setMounted(true)
    const savedToken = localStorage.getItem("auth_token")
    const savedUser = localStorage.getItem("auth_user")

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  // Auto refresh token
  useEffect(() => {
    if (token) {
      const refreshToken = localStorage.getItem("refresh_token")
      if (refreshToken) {
        // Set up auto refresh logic here if needed
        // For now, we'll implement basic token management
      }
    }
  }, [token])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "登录请求失败" }))
        
        // 详细的错误处理
        if (response.status === 401) {
          throw new Error("用户名或密码错误")
        } else if (response.status === 403) {
          throw new Error("账户已被禁用，请联系管理员")
        } else if (response.status === 429) {
          throw new Error("登录尝试过于频繁，请稍后再试")
        } else if (response.status >= 500) {
          throw new Error("服务器繁忙，请稍后再试")
        } else {
          throw new Error(error.message || "登录失败")
        }
      }

      const data: LoginResponse = await response.json().then((data) => data.data)

      // Save to localStorage
      localStorage.setItem("auth_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      localStorage.setItem("auth_user", JSON.stringify(data.user))

      // Update state
      setToken(data.access_token)
      setUser(data.user)

      router.push("/dashboard")
    } catch (error: any) {
      // 网络错误处理
      if (ErrorHandler.isNetworkError(error)) {
        throw new Error("网络连接失败，请检查网络设置")
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterData) => {
    if (!token) {
      throw new Error("需要管理员权限")
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "注册失败")
      }
    } catch (error: any) {
      throw new Error(error.message || "注册失败")
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      // Clear local storage
      localStorage.removeItem("auth_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("auth_user")

      // Clear state
      setToken(null)
      setUser(null)
      setLoading(false)

      router.push("/login")
    }
  }

  if (!mounted) {
    return null
  }
  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    register,
    loading,
    isAuthenticated: !!user && !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
