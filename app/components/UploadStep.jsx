'use client'

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function UploadStep({ onComplete }) {
  const { setLetterboxdData, userApiKey, setUserApiKey, letterboxdData } = useApp()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [hasExistingData, setHasExistingData] = useState(false)
  
  // Check if data already exists - only on client side to avoid hydration mismatch
  useEffect(() => {
    const hasData = letterboxdData && (
      letterboxdData.diary.length > 0 || 
      letterboxdData.watched.length > 0 || 
      letterboxdData.lists.length > 0 ||
      letterboxdData.profile
    )
    setHasExistingData(hasData)
  }, [letterboxdData])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file before upload
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a ZIP file. The file must have a .zip extension.')
      return
    }

    if (file.size === 0) {
      setError('The file you uploaded is empty. Please upload a valid ZIP file.')
      return
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File is too large. Please upload a ZIP file smaller than 50MB.')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadedFiles([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-zip', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = 'Failed to parse ZIP file'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          
          // Provide specific guidance based on error
          if (errorMessage.includes('No file provided')) {
            errorMessage = 'No file was received. Please try uploading again.'
          } else if (errorMessage.includes('ZIP file must contain')) {
            errorMessage = 'The ZIP file doesn\'t contain the required files. Make sure it includes at least diary.csv, watched.csv, or lists folder.'
          } else if (errorMessage.includes('Failed to parse')) {
            errorMessage = 'The ZIP file could not be read. Make sure it\'s a valid ZIP file exported from Letterboxd.'
          }
        } catch (parseError) {
          // If JSON parsing fails, use status-based messages
          if (response.status === 413) {
            errorMessage = 'File is too large. Please upload a smaller ZIP file.'
          } else if (response.status === 400) {
            errorMessage = 'Invalid file format. Please upload a valid Letterboxd ZIP export.'
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.'
          } else {
            errorMessage = `Upload failed (${response.status}). Please try again.`
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Validate response data
      if (!data || (!data.diary && !data.watched && !data.lists && !data.profile)) {
        throw new Error('The ZIP file appears to be empty or doesn\'t contain valid Letterboxd data. Make sure you exported the correct files from Letterboxd.')
      }
      
      // Store all Letterboxd data
      setLetterboxdData({
        diary: data.diary || [],
        watched: data.watched || [],
        ratings: data.ratings || [],
        likes: data.likes || [],
        watchlist: data.watchlist || [],
        reviews: data.reviews || [],
        lists: data.lists || [],
        profile: data.profile || null,
        availableFiles: data.availableFiles || [],
      })
      
      setUploadedFiles(data.availableFiles || [])
      onComplete()
    } catch (err) {
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error: Could not connect to the server. Please check your internet connection and try again.')
      } else {
        setError(err.message || 'Failed to upload file. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl p-8 md:p-10">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-3 text-white">Upload Letterboxd Export</h2>
          <p className="text-gray-400 leading-relaxed">
            Upload your <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded font-mono text-sm">ZIP file</span> exported from Letterboxd.
            The ZIP should contain CSV files like <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded font-mono text-sm">diary.csv</span>, 
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded font-mono text-sm">watched.csv</span>, 
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded font-mono text-sm">ratings.csv</span>, etc.
          </p>
          {hasExistingData && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-blue-300 font-semibold mb-1">Data Already Loaded</p>
                  <p className="text-blue-200/80 text-sm mb-2">
                    You have previously uploaded data. You can continue to category selection or upload a new file to replace it.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onComplete}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Continue with Existing Data
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
                          localStorage.removeItem('letterbox_tiermaker_zip_data')
                          localStorage.removeItem('letterbox_tiermaker_state')
                          window.location.reload()
                        }
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-all"
                    >
                      Clear Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <label className="block group">
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-blue-500 hover:bg-blue-500/5 group-hover:scale-[1.02]">
            {isUploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="text-gray-300 font-medium">Processing your export...</p>
                <p className="text-sm text-gray-500">This may take a moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-200 font-semibold text-lg mb-1">
                    <span className="text-blue-400">Click to upload</span>
                    {' '}or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">ZIP file only</p>
                </div>
              </div>
            )}
          </div>
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        {error && (
          <div className="mt-6 p-5 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-300 font-semibold mb-1">Upload Failed</p>
                <p className="text-red-200/90 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-red-400 hover:text-red-300 text-sm font-medium underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="mt-6 p-5 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-300 font-semibold">
                Successfully loaded {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ul className="list-none space-y-2 ml-8">
              {uploadedFiles.map((file) => (
                <li key={file} className="text-green-200/80 text-sm font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TMDB API Key Input */}
        <div className="mt-6 p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-300 font-semibold">TMDB API Key (Optional)</p>
            </div>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showApiKeyInput ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-blue-200/80 text-sm mb-3">
            For better performance and to avoid rate limits, provide your own TMDB API key. 
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="underline ml-1 hover:text-blue-300">
              Get one here
            </a>
          </p>
          {showApiKeyInput && (
            <div className="space-y-2">
              <input
                type="password"
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="Enter your TMDB API key"
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {userApiKey && (
                <p className="text-green-300 text-xs flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  API key saved (stored locally)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
