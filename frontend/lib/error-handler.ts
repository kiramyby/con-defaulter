export interface ApiError {
  code: number
  message: string
  details?: any
}

export class ErrorHandler {
  private static toastFn: (params: { title: string; description: string; variant?: "default" | "destructive" }) => void

  static setToastFunction(toastFn: typeof ErrorHandler.toastFn) {
    ErrorHandler.toastFn = toastFn
  }

  static handle(error: any, context?: string) {
    console.error('Error in context:', context, error)
    
    let title = "操作失败"
    let description = "发生了未知错误"

    if (error.message) {
      description = error.message
    } else if (typeof error === 'string') {
      description = error
    }

    // 根据错误类型设置不同的标题
    if (description.includes('权限不足')) {
      title = "权限不足"
    } else if (description.includes('登录已过期')) {
      title = "登录过期"
    } else if (description.includes('网络')) {
      title = "网络错误"
    } else if (description.includes('服务器')) {
      title = "服务器错误"
    } else if (description.includes('验证失败')) {
      title = "数据验证失败"
    } else if (context) {
      title = `${context}失败`
    }

    // 显示错误提示
    if (ErrorHandler.toastFn) {
      ErrorHandler.toastFn({
        title,
        description,
        variant: "destructive"
      })
    }
  }

  static handleAsync<T>(
    promise: Promise<T>, 
    context?: string
  ): Promise<T | null> {
    return promise.catch((error) => {
      ErrorHandler.handle(error, context)
      return null
    })
  }

  static parseApiError(response: any): ApiError {
    if (response?.code && response?.message) {
      return {
        code: response.code,
        message: response.message,
        details: response.data
      }
    }

    return {
      code: 500,
      message: "未知的API错误"
    }
  }

  static getErrorMessage(error: any): string {
    if (error?.message) return error.message
    if (typeof error === 'string') return error
    if (error?.code && error?.message) return error.message
    return "发生了未知错误"
  }

  static isNetworkError(error: any): boolean {
    return error instanceof TypeError && error.message.includes('fetch')
  }

  static isPermissionError(error: any): boolean {
    const message = ErrorHandler.getErrorMessage(error).toLowerCase()
    return message.includes('权限') || message.includes('permission') || message.includes('forbidden')
  }

  static isAuthError(error: any): boolean {
    const message = ErrorHandler.getErrorMessage(error).toLowerCase()
    return message.includes('登录') || message.includes('token') || message.includes('unauthorized') || message.includes('认证')
  }
}

// React Hook for error handling
export function useErrorHandler() {
  const handle = (error: any, context?: string) => {
    ErrorHandler.handle(error, context)
  }

  const handleAsync = <T>(promise: Promise<T>, context?: string) => {
    return ErrorHandler.handleAsync(promise, context)
  }

  return { handle, handleAsync }
}