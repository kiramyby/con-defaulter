import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>
}
