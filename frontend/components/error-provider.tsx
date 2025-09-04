"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { ErrorHandler } from "@/lib/error-handler"

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()

  useEffect(() => {
    // Initialize ErrorHandler with toast function
    ErrorHandler.setToastFunction(toast)
  }, [toast])

  return <>{children}</>
}