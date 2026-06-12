import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--sage-50)]">
          <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-sm border border-[var(--sage-200)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--sage-900)]">页面出现错误</h2>
            </div>
            <p className="text-sm text-[var(--sage-600)] mb-4">
              组件渲染过程中发生错误。请刷新页面重试，或返回首页。
            </p>
            {this.state.error && (
              <pre className="text-xs bg-[var(--sage-50)] p-3 rounded border border-[var(--sage-200)] text-[var(--sage-700)] overflow-auto max-h-40 mb-4">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[var(--sage-600)] text-white text-sm rounded-md hover:bg-[var(--sage-700)] transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-[var(--sage-100)] text-[var(--sage-700)] text-sm rounded-md hover:bg-[var(--sage-200)] transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
