import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 公开路径
  const isPublicPath = path === "/login"

  // 获取cookie中的用户信息
  const token = request.cookies.get("user")?.value

  // 如果已登录用户访问登录页，重定向到主页
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 如果未登录用户访问非公开路径，重定向到登录页
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}