import { ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions, type Permission } from "@/lib/permissions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface PermissionGuardProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({ 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback,
  children 
}: PermissionGuardProps) {
  const { user } = useAuth()
  const permissionsManager = usePermissions(user)

  // Build permission list
  const permissionList = permission ? [permission] : permissions

  if (permissionList.length === 0) {
    return <>{children}</>
  }

  // Check permissions
  const hasPermission = requireAll 
    ? permissionsManager.hasAllPermissions(permissionList)
    : permissionsManager.hasAnyPermission(permissionList)

  if (!hasPermission) {
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

// 便捷的权限检查组件
export function RequirePermission({ 
  permission, 
  children, 
  fallback 
}: { 
  permission: Permission; 
  children: ReactNode; 
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard 
      permission={permission} 
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

// 角色检查组件
export function RequireRole({ 
  role, 
  roles = [], 
  children, 
  fallback 
}: { 
  role?: string; 
  roles?: string[];
  children: ReactNode; 
  fallback?: ReactNode 
}) {
  const { user } = useAuth()
  
  const roleList = role ? [role] : roles
  const hasRole = user && roleList.includes(user.role)

  if (!hasRole) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          您的角色无权访问此功能。
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

// Hook for conditional rendering based on permissions
export function usePermissionCheck() {
  const { user } = useAuth()
  const permissions = usePermissions(user)

  const canAccess = (permission: Permission): boolean => {
    return permissions.hasPermission(permission)
  }

  const canAccessAny = (permissionList: Permission[]): boolean => {
    return permissions.hasAnyPermission(permissionList)
  }

  const canAccessAll = (permissionList: Permission[]): boolean => {
    return permissions.hasAllPermissions(permissionList)
  }

  const hasRole = (role: string): boolean => {
    return user?.role === role
  }

  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false
  }

  return {
    canAccess,
    canAccessAny,
    canAccessAll,
    hasRole,
    hasAnyRole,
    user
  }
}