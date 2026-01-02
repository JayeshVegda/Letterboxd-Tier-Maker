'use client'

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#1a1a1a]/80 backdrop-blur-sm border border-red-500/30 rounded-2xl shadow-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-12 h-12 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-red-300 mb-2">Something went wrong</h1>
                <p className="text-gray-300 mb-4">
                  An unexpected error occurred. This might be due to corrupted data or a browser compatibility issue.
                </p>
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <p className="text-gray-400 text-sm font-mono break-all">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Clear potentially corrupted data
                      try {
                        localStorage.removeItem('letterbox_tiermaker_state')
                        localStorage.removeItem('letterbox_tiermaker_zip_data')
                      } catch (e) {
                        if (process.env.NODE_ENV === 'development') {
                          console.error('Failed to clear storage:', e)
                        }
                      }
                      window.location.reload()
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
                  >
                    Clear Data & Reload
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-all"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
