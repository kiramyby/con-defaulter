"use client"

import { ReactNode, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions, type Permission } from "@/lib/permissions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Loader2 } from "lucide-react"

interface SecureContentProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  loadingFallback?: ReactNode
  children: ReactNode
  onUnauthorized?: () => void
}

export function SecureContent({ 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback,
  loadingFallback,
  children,
  onUnauthorized
}: SecureContentProps) {
  const { user, loading: authLoading } = useAuth()
  const permissionsManager = usePermissions(user)
  const [shouldRender, setShouldRender] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (authLoading) return

    // Build permission list
    const permissionList = permission ? [permission] : permissions

    if (permissionList.length === 0) {
      setShouldRender(true)
      setIsAuthorized(true)
      return
    }

    // Check permissions
    const hasPermission = requireAll 
      ? permissionsManager.hasAllPermissions(permissionList)
      : permissionsManager.hasAnyPermission(permissionList)

    setIsAuthorized(hasPermission)
    setShouldRender(true)

    // Call unauthorized callback if no permission
    if (!hasPermission && onUnauthorized) {
      onUnauthorized()
    }
  }, [user, authLoading, permission, permissions, requireAll, onUnauthorized])

  // Show loading while checking authentication
  if (authLoading || !shouldRender) {
    if (loadingFallback) {
      return <>{loadingFallback}</>
    }
    
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground">加载中...</span>
        </div>
      </div>
    )
  }

  // Show unauthorized message if no permission
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          您没有访问此功能的权限。请联系管理员获取相应权限。
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

// Hook for conditional content loading
export function useSecureContent() {
  const { user } = useAuth()
  const permissions = usePermissions(user)

  const shouldLoadContent = (permission: Permission): boolean => {
    return permissions.hasPermission(permission)
  }

  const shouldLoadAnyContent = (permissionList: Permission[]): boolean => {
    return permissions.hasAnyPermission(permissionList)
  }

  const shouldLoadAllContent = (permissionList: Permission[]): boolean => {
    return permissions.hasAllPermissions(permissionList)
  }

  return {
    shouldLoadContent,
    shouldLoadAnyContent,
    shouldLoadAllContent,
    user
  }
}